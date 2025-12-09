using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs.Savings
{
    // DTOs pour SavingsCustomer
    public class SavingsCustomerCreateDto
    {
        [StringLength(20)]
        public string? CustomerCode { get; set; }

        [Required]
        [StringLength(50, MinimumLength = 2)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(50, MinimumLength = 2)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [Required]
        public SavingsGender Gender { get; set; }

        // Adresse
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Street { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Commune { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Department { get; set; } = string.Empty;

        [StringLength(20)]
        public string? PostalCode { get; set; }

        // Contact
        [Required]
        [RegularExpression(@"^(\+509\s?)?[234579]\d{7}$", ErrorMessage = "Format de numéro haïtien invalide")]
        public string PrimaryPhone { get; set; } = string.Empty;

        [RegularExpression(@"^(\+509\s?)?[234579]\d{7}$", ErrorMessage = "Format de numéro haïtien invalide")]
        public string? SecondaryPhone { get; set; }

        [EmailAddress]
        public string? Email { get; set; }

        [StringLength(100)]
        public string? EmergencyContactName { get; set; }

        [RegularExpression(@"^(\+509\s?)?[234579]\d{7}$", ErrorMessage = "Format de numéro haïtien invalide")]
        public string? EmergencyContactPhone { get; set; }

        // Document d'identité
        [Required]
        public SavingsIdentityDocumentType DocumentType { get; set; }

        [Required]
        [StringLength(50, MinimumLength = 5)]
        public string DocumentNumber { get; set; } = string.Empty;

        [Required]
        public DateTime IssuedDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string IssuingAuthority { get; set; } = string.Empty;

        // Informations professionnelles
        [StringLength(100)]
        public string? Occupation { get; set; }

        [Range(0, 1000000)]
        public decimal? MonthlyIncome { get; set; }

        // Champs optionnels pour Personne Morale
        public bool IsBusiness { get; set; } = false;

        [StringLength(150)]
        public string? CompanyName { get; set; }

        [StringLength(50)]
        public string? LegalForm { get; set; }

        [StringLength(50)]
        public string? TradeRegisterNumber { get; set; }

        [StringLength(50)]
        public string? TaxId { get; set; }

        // Adresse et contact entreprise
        [StringLength(300)]
        public string? HeadOfficeAddress { get; set; }

        [RegularExpression(@"^(\+509\s?)?[234579]\d{7}$")]
        public string? CompanyPhone { get; set; }

        [EmailAddress]
        [StringLength(100)]
        public string? CompanyEmail { get; set; }

        // Représentant légal
        [StringLength(50)]
        public string? RepresentativeFirstName { get; set; }

        [StringLength(50)]
        public string? RepresentativeLastName { get; set; }

        [StringLength(100)]
        public string? RepresentativeTitle { get; set; }

        public SavingsIdentityDocumentType? RepresentativeDocumentType { get; set; }

        [StringLength(50)]
        public string? RepresentativeDocumentNumber { get; set; }

        public DateTime? RepresentativeIssuedDate { get; set; }
        public DateTime? RepresentativeExpiryDate { get; set; }

        [StringLength(100)]
        public string? RepresentativeIssuingAuthority { get; set; }

        // Informations personnelles additionnelles
        [StringLength(100)]
        public string? BirthPlace { get; set; }

        [StringLength(50)]
        public string? Nationality { get; set; }

        [StringLength(50)]
        public string? PersonalNif { get; set; }

        // Informations professionnelles étendues
        [StringLength(150)]
        public string? EmployerName { get; set; }

        [StringLength(300)]
        public string? WorkAddress { get; set; }

        [StringLength(50)]
        public string? IncomeSource { get; set; }

        // Informations familiales et sociales
        [StringLength(20)]
        public string? MaritalStatus { get; set; }

        [StringLength(100)]
        public string? SpouseName { get; set; }

        [Range(0, 50)]
        public int? NumberOfDependents { get; set; }

        [StringLength(30)]
        public string? EducationLevel { get; set; }

        // Déclaration et acceptation
        public bool AcceptTerms { get; set; } = false;

        [StringLength(100)]
        public string? SignaturePlace { get; set; }

        public DateTime? SignatureDate { get; set; }

        // Personne de référence optionnelle
        [StringLength(100)]
        public string? ReferencePersonName { get; set; }

        [StringLength(20)]
        public string? ReferencePersonPhone { get; set; }

        // Informations KYC additionnelles
        [StringLength(50)]
        public string? TransactionFrequency { get; set; }

        [StringLength(200)]
        public string? AccountPurpose { get; set; }
    }

    public class SavingsCustomerUpdateDto : SavingsCustomerCreateDto
    {
        public bool IsActive { get; set; } = true;
    }

    public class SavingsCustomerResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string? CustomerCode { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public SavingsGender Gender { get; set; }
        public SavingsCustomerAddressDto Address { get; set; } = new();
        public SavingsCustomerContactDto Contact { get; set; } = new();
        public SavingsCustomerIdentityDto Identity { get; set; } = new();
        public string? Occupation { get; set; }
        public decimal? MonthlyIncome { get; set; }
        public string? Signature { get; set; }
        // Business info (optionnel)
        public bool IsBusiness { get; set; }
        public string? CompanyName { get; set; }
        public string? LegalForm { get; set; }
        public string? TradeRegisterNumber { get; set; }
        public string? TaxId { get; set; }
        public string? HeadOfficeAddress { get; set; }
        public string? CompanyPhone { get; set; }
        public string? CompanyEmail { get; set; }
        public SavingsCustomerLegalRepresentativeDto? LegalRepresentative { get; set; }
        // Additional personal info
        public string? BirthPlace { get; set; }
        public string? Nationality { get; set; }
        public string? PersonalNif { get; set; }
        public string? EmployerName { get; set; }
        public string? WorkAddress { get; set; }
        public string? IncomeSource { get; set; }
        public string? MaritalStatus { get; set; }
        public int? NumberOfDependents { get; set; }
        public string? EducationLevel { get; set; }
        public bool AcceptTerms { get; set; }
        public string? SignaturePlace { get; set; }
        public DateTime? SignatureDate { get; set; }
        public string? ReferencePersonName { get; set; }
        public string? ReferencePersonPhone { get; set; }
        public List<SavingsCustomerDocumentResponseDto> Documents { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class SavingsCustomerLegalRepresentativeDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Title { get; set; }
        public SavingsIdentityDocumentType? DocumentType { get; set; }
        public string? DocumentNumber { get; set; }
        public DateTime? IssuedDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? IssuingAuthority { get; set; }
    }

    public class SavingsCustomerAddressDto
    {
        public string Street { get; set; } = string.Empty;
        public string Commune { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Country { get; set; } = "Haiti";
        public string? PostalCode { get; set; }
    }

    public class SavingsCustomerContactDto
    {
        public string PrimaryPhone { get; set; } = string.Empty;
        public string? SecondaryPhone { get; set; }
        public string? Email { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
    }

    public class SavingsCustomerIdentityDto
    {
        public SavingsIdentityDocumentType DocumentType { get; set; }
        public string DocumentNumber { get; set; } = string.Empty;
        public DateTime IssuedDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string IssuingAuthority { get; set; } = string.Empty;
    }

    // DTOs pour SavingsAccount
    public class SavingsAccountOpeningDto
    {
        // Option 1: Ouvrir un compte pour un client existant
        public string? ExistingCustomerId { get; set; }

        // Option 2: Créer un nouveau client au moment de l'ouverture
        public SavingsCustomerCreateDto? Customer { get; set; }

        [Required]
        public SavingsCurrency Currency { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Le dépôt initial doit être positif")]
        public decimal InitialDeposit { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Succursale invalide")]
        public int BranchId { get; set; }

        public decimal? InterestRate { get; set; }

        public SavingsAccountLimitsDto? AccountLimits { get; set; }

        // Signataires autorisés
        public List<SavingsAccountAuthorizedSignerDto>? AuthorizedSigners { get; set; }
    }

    public class SavingsAccountUpdateDto
    {
        [Required]
        public SavingsAccountStatus Status { get; set; }

        public decimal? InterestRate { get; set; }

        public SavingsAccountLimitsDto? AccountLimits { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; } // Raison fournie pour suspension ou fermeture

        // Signataires autorisés (pour mise à jour)
        public List<SavingsAccountAuthorizedSignerDto>? AuthorizedSigners { get; set; }
    }

    public class SavingsAccountResponseDto
    {
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public SavingsCustomerResponseDto? Customer { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public SavingsCurrency Currency { get; set; }
        public decimal Balance { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal BlockedBalance { get; set; }
        public decimal MinimumBalance { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        public SavingsAccountStatus Status { get; set; }
        public decimal InterestRate { get; set; }
        public decimal AccruedInterest { get; set; }
        public DateTime? LastInterestCalculation { get; set; }
        public SavingsAccountLimitsDto AccountLimits { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }
        public DateTime? SuspendedAt { get; set; }
        public string? SuspendedBy { get; set; }
        public string? SuspensionReason { get; set; }
        public List<SavingsAccountAuthorizedSignerResponseDto> AuthorizedSigners { get; set; } = new();
    }

    public class SavingsAccountAuthorizedSignerDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Role { get; set; }

        public SavingsIdentityDocumentType? DocumentType { get; set; }

        [StringLength(50)]
        public string? DocumentNumber { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(100)]
        public string? RelationshipToCustomer { get; set; }

        [StringLength(300)]
        public string? Address { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? AuthorizationLimit { get; set; }

        public string? Signature { get; set; } // Base64 signature image

        [StringLength(500)]
        public string? PhotoUrl { get; set; } // Base64 photo or URL
    }

    public class SavingsAccountAuthorizedSignerResponseDto : SavingsAccountAuthorizedSignerDto
    {
        public string Id { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SavingsAccountLimitsDto
    {
        public decimal DailyWithdrawalLimit { get; set; }
        public decimal DailyDepositLimit { get; set; }
        public decimal MonthlyWithdrawalLimit { get; set; }
        public decimal MaxBalance { get; set; }
        public decimal MinWithdrawalAmount { get; set; }
        public decimal MaxWithdrawalAmount { get; set; }
    }

    // DTOs pour SavingsTransaction
    public class SavingsTransactionCreateDto
    {
        [Required]
        [StringLength(12, MinimumLength = 12)]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public SavingsTransactionType Type { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Required]
        public bool CustomerPresent { get; set; }

        public string? CustomerSignature { get; set; }

        [Required]
        [StringLength(50)]
        public string VerificationMethod { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Notes { get; set; }
    }

    // DTO pour transfert entre comptes d'épargne
    public class SavingsTransferCreateDto
    {
        [Required]
        [StringLength(12, MinimumLength = 12)]
        public string SourceAccountNumber { get; set; } = string.Empty;

        [Required]
        [StringLength(12, MinimumLength = 12)]
        public string DestinationAccountNumber { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Required]
        public bool CustomerPresent { get; set; }

        public string? CustomerSignature { get; set; }

        [Required]
        [StringLength(50)]
        public string VerificationMethod { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Notes { get; set; }
    }

    public class SavingsTransferResponseDto
    {
        public SavingsTransactionResponseDto? SourceTransaction { get; set; }
        public SavingsTransactionResponseDto? DestinationTransaction { get; set; }
    }

    public class SavingsTransactionResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public SavingsCurrency Currency { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Reference { get; set; } = string.Empty;
        public string ProcessedBy { get; set; } = string.Empty;
        public string? ProcessedByName { get; set; }
        public int BranchId { get; set; }
        public string? BranchName { get; set; }
        public SavingsTransactionStatus Status { get; set; }
        public DateTime ProcessedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal? Fees { get; set; }
        public decimal? ExchangeRate { get; set; }
        public string? RelatedTransactionId { get; set; }
        public string? CustomerSignature { get; set; }
        public string? ReceiptNumber { get; set; }
        public string? VerificationMethod { get; set; }
        public string? Notes { get; set; }
    }

    // DTOs pour les filtres
    public class SavingsAccountFilterDto
    {
        public string? Search { get; set; }
        public SavingsCurrency? Currency { get; set; }
        public SavingsAccountStatus? Status { get; set; }
        public int? BranchId { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public decimal? MinBalance { get; set; }
        public decimal? MaxBalance { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; } = "AccountNumber";
        public string? SortDirection { get; set; } = "asc";
    }

    public class SavingsTransactionFilterDto
    {
        public string? AccountId { get; set; }
        public SavingsTransactionType? Type { get; set; }
        public SavingsTransactionStatus? Status { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
        public int? BranchId { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; } = "ProcessedAt";
        public string? SortDirection { get; set; } = "desc";
    }

    // DTOs pour les réponses paginées
    public class SavingsAccountListResponseDto
    {
        public List<SavingsAccountResponseDto> Accounts { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public SavingsAccountStatisticsDto Statistics { get; set; } = new();
    }

    public class SavingsTransactionListResponseDto
    {
        public List<SavingsTransactionResponseDto> Transactions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public SavingsTransactionSummaryDto Summary { get; set; } = new();
    }

    // DTOs pour les statistiques
    public class SavingsAccountStatisticsDto
    {
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public decimal TotalBalanceHTG { get; set; }
        public decimal TotalBalanceUSD { get; set; }
        public decimal AverageBalance { get; set; }
        public Dictionary<string, int> AccountsByStatus { get; set; } = new();
        public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
        public int NewAccountsThisMonth { get; set; }
        public int DormantAccounts { get; set; }
    }

    public class SavingsTransactionSummaryDto
    {
        public int TotalTransactions { get; set; }
        public int TotalDeposits { get; set; }
        public int TotalWithdrawals { get; set; }
        public decimal TotalVolume { get; set; }
        public decimal AverageTransaction { get; set; }
        public Dictionary<string, int> TransactionsByType { get; set; } = new();
        public Dictionary<string, decimal> DailyVolume { get; set; } = new();
    }

    // DTOs pour les relevés
    public class SavingsAccountStatementRequestDto
    {
        [Required]
        public string AccountId { get; set; } = string.Empty;

        [Required]
        public DateTime PeriodFrom { get; set; }

        [Required]
        public DateTime PeriodTo { get; set; }

        public bool IncludeTransactions { get; set; } = true;
        public bool GeneratePdf { get; set; } = false;
        public bool SendByEmail { get; set; } = false;
    }

    public class SavingsAccountStatementResponseDto
    {
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public DateTime PeriodFrom { get; set; }
        public DateTime PeriodTo { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal ClosingBalance { get; set; }
        public List<SavingsTransactionResponseDto> Transactions { get; set; } = new();
        public decimal InterestEarned { get; set; }
        public decimal TotalCredits { get; set; }
        public decimal TotalDebits { get; set; }
        public DateTime GeneratedAt { get; set; }
        public string GeneratedBy { get; set; } = string.Empty;
        public string? PdfUrl { get; set; }
    }

    // DTOs utilitaires
    public class SavingsAccountBalanceDto
    {
        public decimal Current { get; set; }
        public decimal Available { get; set; }
        public SavingsCurrency Currency { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class SavingsInterestCalculationDto
    {
        public string Period { get; set; } = string.Empty;
        public decimal Rate { get; set; }
        public decimal Principal { get; set; }
        public decimal Interest { get; set; }
        public bool Compound { get; set; }
        public DateTime CalculationDate { get; set; }
    }

    // DTOs pour les reçus
    public class SavingsTransactionReceiptDto
    {
        public string TransactionId { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public SavingsCurrency Currency { get; set; }
        public decimal BalanceAfter { get; set; }
        public DateTime ProcessedAt { get; set; }
        public string ProcessedBy { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public string? Signature { get; set; }
    }

    // DTOs pour les documents clients
    public class SavingsCustomerDocumentUploadDto
    {
        [Required]
        public SavingsCustomerDocumentType DocumentType { get; set; }

        [Required]
        [StringLength(200, MinimumLength = 3)]
        public string Name { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }

        [Required]
        public IFormFile File { get; set; } = null!;
    }

    public class SavingsCustomerDocumentResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public SavingsCustomerDocumentType DocumentType { get; set; }
        public string DocumentTypeName { get; set; } = string.Empty;
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
        public string? DownloadUrl { get; set; }
    }

    public class SavingsCustomerSignatureDto
    {
        [Required]
        public string SignatureData { get; set; } = string.Empty; // Base64 encoded image
    }
}