using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    public enum SavingsCurrency
    {
        HTG = 0,
        USD = 1
    }

    public enum SavingsAccountStatus
    {
        Active = 0,
        Inactive = 1,
        Closed = 2,
        Suspended = 3
    }

    public enum SavingsTransactionType
    {
        Deposit = 0,
        Withdrawal = 1,
        Interest = 2,
        Fee = 3,
        OpeningDeposit = 4,
        Other = 5
    }

    public enum SavingsTransactionStatus
    {
        Pending = 0,
        Processing = 1,
        Completed = 2,
        Cancelled = 3,
        Failed = 4
    }

    public enum SavingsIdentityDocumentType
    {
        CIN = 0,          // Carte d'Identité Nationale
        Passport = 1,
        DrivingLicense = 2
        // BirthCertificate = 3 // Removed for frontend/backend alignment
    }

    public enum SavingsGender
    {
        Male = 0,
        Female = 1
    }

    public enum SavingsCustomerDocumentType
    {
        IdentityCardFront = 0,      // Devan CIN
        IdentityCardBack = 1,       // Dèyè CIN
        PassportPhoto = 2,          // Foto Paspo
        ProofOfResidence = 3,       // Justifikatif Rezidans
        // BirthCertificate = 4,    // Sètifika Nesans (removed for alignment)
        Photo = 5,                  // Foto Kliyan
        Other = 6                   // Lòt Dokiman
    }

    [Table("SavingsCustomers")]
    public class SavingsCustomer
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        // Code client unique (ex: FV2528)
        [MaxLength(20)]
        public string? CustomerCode { get; set; }

        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;

        [NotMapped]
        public string FullName => $"{FirstName} {LastName}";

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required]
        public SavingsGender Gender { get; set; }

        // Adresse
        [Required]
        [MaxLength(200)]
        public string Street { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Commune { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Department { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Country { get; set; } = "Haiti";

        [MaxLength(20)]
        public string? PostalCode { get; set; }

        // Contact
        [Required]
        [MaxLength(20)]
        public string PrimaryPhone { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? SecondaryPhone { get; set; }

        [MaxLength(100)]
        [EmailAddress]
        public string? Email { get; set; }

        [MaxLength(100)]
        public string? EmergencyContactName { get; set; }

        [MaxLength(20)]
        public string? EmergencyContactPhone { get; set; }

    // Entreprise (Personne Morale)
    public bool IsBusiness { get; set; } = false;

    [MaxLength(150)]
    public string? CompanyName { get; set; }

    [MaxLength(50)]
    public string? LegalForm { get; set; } // SARL, SA, etc.

    [MaxLength(50)]
    public string? TradeRegisterNumber { get; set; }

    [MaxLength(50)]
    public string? TaxId { get; set; }

    // Adresse et contact entreprise
    [MaxLength(300)]
    public string? HeadOfficeAddress { get; set; }

    [MaxLength(20)]
    public string? CompanyPhone { get; set; }

    [MaxLength(100)]
    [EmailAddress]
    public string? CompanyEmail { get; set; }

    // Représentant légal
    [MaxLength(50)]
    public string? RepresentativeFirstName { get; set; }

    [MaxLength(50)]
    public string? RepresentativeLastName { get; set; }

    [MaxLength(100)]
    public string? RepresentativeTitle { get; set; } // Titre/Fonction

    public SavingsIdentityDocumentType? RepresentativeDocumentType { get; set; }

    [MaxLength(50)]
    public string? RepresentativeDocumentNumber { get; set; }

    public DateTime? RepresentativeIssuedDate { get; set; }

    public DateTime? RepresentativeExpiryDate { get; set; }

    [MaxLength(100)]
    public string? RepresentativeIssuingAuthority { get; set; }

        // Document d'identité
        [Required]
        public SavingsIdentityDocumentType DocumentType { get; set; }

        [Required]
        [MaxLength(50)]
        public string DocumentNumber { get; set; } = string.Empty;

        [Required]
        public DateTime IssuedDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [Required]
        [MaxLength(100)]
        public string IssuingAuthority { get; set; } = string.Empty;

        // Informations professionnelles
        [MaxLength(100)]
        public string? Occupation { get; set; }

        [MaxLength(150)]
        public string? EmployerName { get; set; }

        [MaxLength(300)]
        public string? WorkAddress { get; set; }

        [MaxLength(50)]
        public string? IncomeSource { get; set; } // SALARY, BUSINESS, TRANSFER, AGRICULTURE, OTHER

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MonthlyIncome { get; set; }

    // Informations personnelles additionnelles
    [MaxLength(100)]
    public string? BirthPlace { get; set; }

    [MaxLength(50)]
    public string? Nationality { get; set; }

    [MaxLength(50)]
    public string? PersonalNif { get; set; } // NIF personnel (différent de TaxId entreprise)

    // Informations familiales et sociales
    [MaxLength(20)]
    public string? MaritalStatus { get; set; } // SINGLE, MARRIED, DIVORCED, WIDOWED

    [MaxLength(100)]
    public string? SpouseName { get; set; } // Nom du conjoint

    public int? NumberOfDependents { get; set; }

    [MaxLength(30)]
    public string? EducationLevel { get; set; } // PRIMARY, SECONDARY, VOCATIONAL, UNIVERSITY, NONE

    // Personne de référence optionnelle
    [MaxLength(100)]
    public string? ReferencePersonName { get; set; }

    [MaxLength(20)]
    public string? ReferencePersonPhone { get; set; }

    // Informations KYC additionnelles
    [MaxLength(50)]
    public string? TransactionFrequency { get; set; } // DAILY, WEEKLY, MONTHLY, OCCASIONAL

    [MaxLength(200)]
    public string? AccountPurpose { get; set; } // Objectif du compte

        // Signature
        public string? Signature { get; set; } // Base64 image data

    // Déclaration et acceptation
    public bool AcceptTerms { get; set; } = false;

    [MaxLength(100)]
    public string? SignaturePlace { get; set; }

    public DateTime? SignatureDate { get; set; }

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;

        // Relations
        public virtual ICollection<SavingsAccount> SavingsAccounts { get; set; } = new List<SavingsAccount>();
        public virtual ICollection<SavingsCustomerDocument> Documents { get; set; } = new List<SavingsCustomerDocument>();
    }

    // Documents du client
    [Table("SavingsCustomerDocuments")]
    public class SavingsCustomerDocument
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public SavingsCustomerDocumentType DocumentType { get; set; }

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

        public bool Verified { get; set; } = false;
        public DateTime? VerifiedAt { get; set; }
        public string? VerifiedBy { get; set; }

        // Relations
        [ForeignKey("CustomerId")]
        public virtual SavingsCustomer Customer { get; set; } = null!;
    }

    [Table("SavingsAccounts")]
    public class SavingsAccount
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public SavingsCurrency Currency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal AvailableBalance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal BlockedBalance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MinimumBalance { get; set; } = 0;

        // Optimistic Concurrency Control
        [Timestamp]
        public byte[]? RowVersion { get; set; }

        [Required]
        public DateTime OpeningDate { get; set; }

        public DateTime? LastTransactionDate { get; set; }

        [Required]
        public SavingsAccountStatus Status { get; set; } = SavingsAccountStatus.Active;

        [Column(TypeName = "decimal(8,6)")]
        public decimal InterestRate { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal AccruedInterest { get; set; } = 0;

        public DateTime? LastInterestCalculation { get; set; }

        // Limites du compte
        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyWithdrawalLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyDepositLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyWithdrawalLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MaxBalance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MinWithdrawalAmount { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MaxWithdrawalAmount { get; set; } = 0;

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Fermeture de compte
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }

        // Relations
        [ForeignKey("CustomerId")]
        public virtual SavingsCustomer Customer { get; set; } = null!;

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }

        public virtual ICollection<SavingsTransaction> Transactions { get; set; } = new List<SavingsTransaction>();
    }

    [Table("SavingsTransactions")]
    public class SavingsTransaction
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string AccountId { get; set; } = string.Empty;

        [Required]
        [MaxLength(12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public SavingsTransactionType Type { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        public SavingsCurrency Currency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceBefore { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceAfter { get; set; } = 0;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Reference { get; set; } = string.Empty;

        [Required]
        public string ProcessedBy { get; set; } = string.Empty;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public SavingsTransactionStatus Status { get; set; } = SavingsTransactionStatus.Completed;

        [Required]
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Frais et taux de change
        [Column(TypeName = "decimal(18,2)")]
        public decimal? Fees { get; set; }

        [Column(TypeName = "decimal(10,6)")]
        public decimal? ExchangeRate { get; set; }

        // Transaction liée (pour les transfers, etc.)
        public string? RelatedTransactionId { get; set; }

        // Signature et reçu
        public string? CustomerSignature { get; set; }

        [MaxLength(50)]
        public string? ReceiptNumber { get; set; }

        // Méthode de vérification
        [MaxLength(50)]
        public string? VerificationMethod { get; set; }

        // Notes internes
        [MaxLength(1000)]
        public string? Notes { get; set; }

        // Relations
        [ForeignKey("AccountId")]
        public virtual SavingsAccount Account { get; set; } = null!;

        [ForeignKey("ProcessedBy")]
        public virtual User ProcessedByUser { get; set; } = null!;

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }
    }

    // Configuration des comptes d'épargne
    [Table("SavingsAccountConfigs")]
    public class SavingsAccountConfig
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public SavingsCurrency Currency { get; set; }

        // Dépôts minimum
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinimumOpeningDeposit { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MinimumBalance { get; set; }

        // Taux d'intérêt par défaut
        [Column(TypeName = "decimal(8,6)")]
        public decimal DefaultInterestRate { get; set; }

        // Limites par défaut
        [Column(TypeName = "decimal(18,2)")]
        public decimal DefaultDailyWithdrawalLimit { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DefaultDailyDepositLimit { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DefaultMonthlyWithdrawalLimit { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DefaultMaxBalance { get; set; }

        // Frais
        [Column(TypeName = "decimal(18,2)")]
        public decimal WithdrawalFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BelowMinimumBalanceFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AccountMaintenanceFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal StatementPrintFee { get; set; }

        // Règles métier
        public int MaxAccountsPerCustomer { get; set; } = 3;
        public int RequireMinimumAge { get; set; } = 16;
        public bool AllowJointAccounts { get; set; } = false;
        
        [MaxLength(20)]
        public string InterestCalculationFrequency { get; set; } = "MONTHLY"; // DAILY, MONTHLY, QUARTERLY

        public int DormancyPeriodDays { get; set; } = 365;

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }

    // Statistiques des comptes
    public class AccountStatistics
    {
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public decimal TotalBalanceHTG { get; set; }
        public decimal TotalBalanceUSD { get; set; }
        public decimal AverageBalance { get; set; }
        public Dictionary<SavingsAccountStatus, int> AccountsByStatus { get; set; } = new();
        public Dictionary<SavingsCurrency, int> AccountsByCurrency { get; set; } = new();
        public int NewAccountsThisMonth { get; set; }
        public int DormantAccounts { get; set; }
    }

    // Résumé des transactions
    public class TransactionSummary
    {
        public int TotalTransactions { get; set; }
        public int TotalDeposits { get; set; }
        public int TotalWithdrawals { get; set; }
        public decimal TotalVolume { get; set; }
        public decimal AverageTransaction { get; set; }
        public Dictionary<SavingsTransactionType, int> TransactionsByType { get; set; } = new();
        public Dictionary<string, decimal> DailyVolume { get; set; } = new();
    }

    // Calcul d'intérêts
    public class InterestCalculation
    {
        public string Period { get; set; } = string.Empty;
        public decimal Rate { get; set; }
        public decimal Principal { get; set; }
        public decimal Interest { get; set; }
        public bool Compound { get; set; }
        public DateTime CalculationDate { get; set; }
    }

    // Relevé de compte
    public class AccountStatement
    {
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public DateTime PeriodFrom { get; set; }
        public DateTime PeriodTo { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; }
        public List<SavingsTransaction> Transactions { get; set; } = new();
        public decimal InterestEarned { get; set; }
        public decimal TotalCredits { get; set; }
        public decimal TotalDebits { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string GeneratedBy { get; set; } = string.Empty;
    }
}

// Modèles pour les comptes courants et épargne à terme
namespace NalaCreditAPI.Models
{
    public enum ClientAccountType
    {
        Savings = 0,
        Current = 1,
        TermSavings = 2
    }

    public enum ClientAccountStatus
    {
        Active = 0,
        Inactive = 1,
        Closed = 2,
        Suspended = 3,
        Locked = 4,
        PendingApproval = 5
    }

    public enum ClientCurrency
    {
        HTG = 0,
        USD = 1
    }

    public enum TermSavingsType
    {
        ThreeMonths = 0,
        SixMonths = 1,
        TwelveMonths = 2,
        TwentyFourMonths = 3
    }

    [Table("CurrentAccounts")]
    public class CurrentAccount
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public ClientCurrency Currency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal AvailableBalance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MinimumBalance { get; set; } = 0;

        [Required]
        public DateTime OpeningDate { get; set; }

        public DateTime? LastTransactionDate { get; set; }

        [Required]
        public ClientAccountStatus Status { get; set; } = ClientAccountStatus.Active;

    // Sécurité et informations KYC complémentaires
    // Stocker uniquement des empreintes (hash) pour PIN et réponse de sécurité
    [MaxLength(128)]
    public string? PinHash { get; set; }

    [MaxLength(200)]
    public string? SecurityQuestion { get; set; }

    [MaxLength(128)]
    public string? SecurityAnswerHash { get; set; }

    // Informations opérationnelles/KYC
    [MaxLength(50)]
    public string? DepositMethod { get; set; } // Cash, Virement, Chèque, Autre

    [MaxLength(100)]
    public string? OriginOfFunds { get; set; } // Salaire, Commerce, Remittances, etc.

    [MaxLength(50)]
    public string? TransactionFrequency { get; set; } // Quotidien, Hebdomadaire, Mensuel, etc.

    [MaxLength(200)]
    public string? AccountPurpose { get; set; } // Objet du compte

        // Limites du compte courant
        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyWithdrawalLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyWithdrawalLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyDepositLimit { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal OverdraftLimit { get; set; } = 0;

        // Frais
        [Column(TypeName = "decimal(18,2)")]
        public decimal MaintenanceFee { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TransactionFee { get; set; } = 0;

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Fermeture de compte
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }

        // Relations
        [ForeignKey("CustomerId")]
        public virtual SavingsCustomer Customer { get; set; } = null!;

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }

        public virtual ICollection<CurrentAccountTransaction> Transactions { get; set; } = new List<CurrentAccountTransaction>();

        // Signataires autorisés
        public virtual ICollection<CurrentAccountAuthorizedSigner> AuthorizedSigners { get; set; } = new List<CurrentAccountAuthorizedSigner>();
    }

    [Table("CurrentAccountAuthorizedSigners")]
    public class CurrentAccountAuthorizedSigner
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string AccountId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Role { get; set; } // Signataire, Co-titulaire, etc.

        public SavingsIdentityDocumentType? DocumentType { get; set; }

        [MaxLength(50)]
        public string? DocumentNumber { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(100)]
        public string? RelationshipToCustomer { get; set; } // Bénéficiaire, Co-titulaire, Mandataire, etc.

        [MaxLength(300)]
        public string? Address { get; set; }

        public string? Signature { get; set; } // Base64 signature

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? AuthorizationLimit { get; set; } // Limite d'autorisation pour les transactions

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("AccountId")]
        public virtual CurrentAccount Account { get; set; } = null!;
    }

    [Table("TermSavingsAccounts")]
    public class TermSavingsAccount
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public ClientCurrency Currency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal AvailableBalance { get; set; } = 0; // 0 jusqu'à la maturité

        [Required]
        public TermSavingsType TermType { get; set; }

        [Required]
        public DateTime OpeningDate { get; set; }

        [Required]
        public DateTime MaturityDate { get; set; }

        public DateTime? LastTransactionDate { get; set; }

        [Required]
        public ClientAccountStatus Status { get; set; } = ClientAccountStatus.Active;

        [Column(TypeName = "decimal(8,6)")]
        public decimal InterestRate { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal AccruedInterest { get; set; } = 0;

        public DateTime? LastInterestCalculation { get; set; }

        // Pénalités pour retrait anticipé
        [Column(TypeName = "decimal(8,6)")]
        public decimal EarlyWithdrawalPenalty { get; set; } = 0;

        // Audit
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Fermeture de compte
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }

        // Relations
        [ForeignKey("CustomerId")]
        public virtual SavingsCustomer Customer { get; set; } = null!;

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }

        public virtual ICollection<TermSavingsTransaction> Transactions { get; set; } = new List<TermSavingsTransaction>();
    }

    [Table("CurrentAccountTransactions")]
    public class CurrentAccountTransaction
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string AccountId { get; set; } = string.Empty;

        [Required]
        [MaxLength(12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public SavingsTransactionType Type { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        public ClientCurrency Currency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceBefore { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceAfter { get; set; } = 0;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Reference { get; set; } = string.Empty;

        [Required]
        public string ProcessedBy { get; set; } = string.Empty;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public SavingsTransactionStatus Status { get; set; } = SavingsTransactionStatus.Completed;

        [Required]
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Frais et taux de change
        [Column(TypeName = "decimal(18,2)")]
        public decimal? Fees { get; set; }

        [Column(TypeName = "decimal(10,6)")]
        public decimal? ExchangeRate { get; set; }

        // For linking transfer transactions
        public string? RelatedTransactionId { get; set; }

        // Relations
        [ForeignKey("AccountId")]
        public virtual CurrentAccount Account { get; set; } = null!;

        [ForeignKey("ProcessedBy")]
        public virtual User ProcessedByUser { get; set; } = null!;

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }
    }

    [Table("TermSavingsTransactions")]
    public class TermSavingsTransaction
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string AccountId { get; set; } = string.Empty;

        [Required]
        [MaxLength(12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public SavingsTransactionType Type { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        public ClientCurrency Currency { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceBefore { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceAfter { get; set; } = 0;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Reference { get; set; } = string.Empty;

        [Required]
        public string ProcessedBy { get; set; } = string.Empty;

        [Required]
        public int BranchId { get; set; }

        [Required]
        public SavingsTransactionStatus Status { get; set; } = SavingsTransactionStatus.Completed;

        [Required]
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Frais et taux de change
        [Column(TypeName = "decimal(18,2)")]
        public decimal? Fees { get; set; }

        [Column(TypeName = "decimal(10,6)")]
        public decimal? ExchangeRate { get; set; }

        // Relations
        [ForeignKey("AccountId")]
        public virtual TermSavingsAccount Account { get; set; } = null!;

        [ForeignKey("ProcessedBy")]
        public virtual User ProcessedByUser { get; set; } = null!;

        [ForeignKey("BranchId")]
        public virtual Branch? Branch { get; set; }
    }

    // Classes utilitaires pour les comptes clients
    public class ClientAccountStatistics
    {
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public decimal TotalBalanceHTG { get; set; }
        public decimal TotalBalanceUSD { get; set; }
        public Dictionary<ClientAccountType, int> AccountsByType { get; set; } = new();
        public Dictionary<ClientCurrency, int> AccountsByCurrency { get; set; } = new();
        public int RecentTransactions { get; set; }
        public int DormantAccounts { get; set; }
    }

    public class ClientAccountSummary
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public ClientAccountType AccountType { get; set; }
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public ClientCurrency Currency { get; set; }
        public decimal Balance { get; set; }
        public decimal AvailableBalance { get; set; }
        public ClientAccountStatus Status { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        public decimal? InterestRate { get; set; }
        public TermSavingsType? TermType { get; set; }
        public DateTime? MaturityDate { get; set; }
        public decimal? MinimumBalance { get; set; }
        public decimal? DailyWithdrawalLimit { get; set; }
        public decimal? MonthlyWithdrawalLimit { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}