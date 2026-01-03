using System;

namespace NalaCreditDesktop.Models;

public enum SavingsCurrency
{
    HTG = 0,
    USD = 1
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

public enum SavingsGender
{
    Male = 0,
    Female = 1
}

public enum SavingsIdentityDocumentType
{
    Passport = 0,
    NationalId = 1,
    DriversLicense = 2
}

public enum SavingsAccountType
{
    Savings = 0,
    Current = 1,
    TermSavings = 2
}

public enum SavingsAccountStatus
{
    Active = 0,
    Inactive = 1,
    Suspended = 2,
    Closed = 3
}

public enum TermSavingsType
{
    ThreeMonths = 0,
    SixMonths = 1,
    TwelveMonths = 2,
    TwentyFourMonths = 3,
    ThirtySixMonths = 4
}

public sealed class SavingsAccountInfo
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    public SavingsCustomerInfo? Customer { get; set; }
    public int BranchId { get; set; }
    public string? BranchName { get; set; }
    public SavingsCurrency Currency { get; set; }
    public decimal Balance { get; set; }
    public decimal AvailableBalance { get; set; }
    public decimal BlockedBalance { get; set; }
    public SavingsAccountLimitsDto? AccountLimits { get; set; }
}

public sealed class SavingsCustomerInfo
{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public SavingsCustomerContactInfo Contact { get; set; } = new();
}

public sealed class SavingsCustomerContactInfo
{
    public string PrimaryPhone { get; set; } = string.Empty;
    public string? SecondaryPhone { get; set; }
    public string? Email { get; set; }
}

public sealed class SavingsAccountLimitsDto
{
    public decimal DailyWithdrawalLimit { get; set; }
    public decimal DailyDepositLimit { get; set; }
    public decimal MonthlyWithdrawalLimit { get; set; }
    public decimal MaxBalance { get; set; }
    public decimal MinWithdrawalAmount { get; set; }
    public decimal MaxWithdrawalAmount { get; set; }
}

public sealed class SavingsAccountFilterDto
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

public sealed class SavingsAccountListResponseDto
{
    public List<SavingsAccountResponseDto> Accounts { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public sealed class SavingsTransactionRequest
{
    public string AccountNumber { get; set; } = string.Empty;
    public SavingsTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public bool CustomerPresent { get; set; } = true;
    public string VerificationMethod { get; set; } = "Vérification identité";
    public string? Description { get; set; }
    public string? Notes { get; set; }
    // Branch and cashier details (so backend can consider cashier's branch)
    public int? BranchId { get; set; }
    public string? BranchName { get; set; }
    public string? CashierName { get; set; }
    public string? CashierCaisseNumber { get; set; }
}

public sealed class SavingsTransactionResponse
{
    public string Id { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public SavingsTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public SavingsCurrency Currency { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Reference { get; set; }
    public string? ReceiptNumber { get; set; }
    public DateTime ProcessedAt { get; set; }
    public string? ProcessedByName { get; set; }
}

// DTOs for creating customers and accounts
public class SavingsCustomerCreateDto
{
    public string? CustomerCode { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string DateOfBirth { get; set; } = string.Empty; // YYYY-MM-DD
    public SavingsGender Gender { get; set; }
    public string Street { get; set; } = string.Empty;
    public string Commune { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public string PrimaryPhone { get; set; } = string.Empty;
    public string? SecondaryPhone { get; set; }
    public string? Email { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public SavingsIdentityDocumentType DocumentType { get; set; }
    public string DocumentNumber { get; set; } = string.Empty;
    public string IssuedDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string? ExpiryDate { get; set; } // YYYY-MM-DD
    public string IssuingAuthority { get; set; } = string.Empty;
    public string? Occupation { get; set; }
    public decimal? MonthlyIncome { get; set; }
    public string? EmployerName { get; set; }
    public string? WorkAddress { get; set; }
    public string? IncomeSource { get; set; }
    public string? BirthPlace { get; set; }
    public string? Nationality { get; set; }
    public string? PersonalNif { get; set; }
    public string? MaritalStatus { get; set; }
    public int? NumberOfDependents { get; set; }
    public string? EducationLevel { get; set; }
    public bool AcceptTerms { get; set; }
    public string? SignaturePlace { get; set; }
    public string? SignatureDate { get; set; }
    public string? ReferencePersonName { get; set; }
    public string? ReferencePersonPhone { get; set; }
    public string? TransactionFrequency { get; set; }
    public string? AccountPurpose { get; set; }
}

public sealed class SavingsCustomerUpdateDto : SavingsCustomerCreateDto
{
    public bool IsActive { get; set; } = true;
}

public sealed class SavingsAccountOpeningDto
{
    // Match backend expected JSON property names
    public string ExistingCustomerId { get; set; } = string.Empty;
    public SavingsAccountType AccountType { get; set; }
    public SavingsCurrency Currency { get; set; }
    public decimal InitialDeposit { get; set; }
    public int BranchId { get; set; }
    public List<SavingsAccountAuthorizedSignerDto>? AuthorizedSigners { get; set; }
    public string? Purpose { get; set; }
    public string? Notes { get; set; }
}

public sealed class TermSavingsAccountOpeningDto
{
    public string CustomerId { get; set; } = string.Empty;
    public SavingsCurrency Currency { get; set; }
    public decimal InitialDeposit { get; set; }
    public int BranchId { get; set; }
    public TermSavingsType TermType { get; set; }
    public decimal? InterestRate { get; set; }
    public List<SavingsAccountAuthorizedSignerDto>? AuthorizedSigners { get; set; }
    public string? Purpose { get; set; }
    public string? Notes { get; set; }
}

public sealed class TermSavingsAccountResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerCode { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public SavingsCurrency Currency { get; set; }
    public decimal Balance { get; set; }
    public decimal AvailableBalance { get; set; }
    public TermSavingsType TermType { get; set; }
    public DateTime OpeningDate { get; set; }
    public DateTime MaturityDate { get; set; }
    public DateTime? LastTransactionDate { get; set; }
    public SavingsAccountStatus Status { get; set; }
    public decimal InterestRate { get; set; }
    public decimal InterestRateMonthly { get; set; }
    public decimal AccruedInterest { get; set; }
    public DateTime? LastInterestCalculation { get; set; }
    public decimal EarlyWithdrawalPenalty { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? ClosedBy { get; set; }
    public string? ClosureReason { get; set; }
    public List<SavingsAccountAuthorizedSignerDto> AuthorizedSigners { get; set; } = new();
}

public sealed class SavingsCustomerResponseDto
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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsActive { get; set; }
}

public sealed class SavingsCustomerAddressDto
{
    public string Street { get; set; } = string.Empty;
    public string Commune { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Country { get; set; } = "Haiti";
    public string? PostalCode { get; set; }
}

public sealed class SavingsCustomerContactDto
{
    public string PrimaryPhone { get; set; } = string.Empty;
    public string? SecondaryPhone { get; set; }
    public string? Email { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
}

public sealed class SavingsCustomerIdentityDto
{
    // Use string to accept backend values like "CIN" without deserialization failures
    public string DocumentType { get; set; } = string.Empty;
    public string DocumentNumber { get; set; } = string.Empty;
    public DateTime IssuedDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string IssuingAuthority { get; set; } = string.Empty;
}

public sealed class SavingsAccountResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public SavingsCustomerResponseDto? Customer { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int BranchId { get; set; }
    public string? BranchName { get; set; }
    public SavingsAccountType AccountType { get; set; }
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
}

public enum SavingsCustomerDocumentType
{
    IdentityCardFront = 0,
    IdentityCardBack = 1,
    PassportPhoto = 2,
    ProofOfResidence = 3,
    Photo = 5,
    Other = 6
}

public sealed class SavingsCustomerDocumentResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string CustomerId { get; set; } = string.Empty;
    public SavingsCustomerDocumentType DocumentType { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public string UploadedBy { get; set; } = string.Empty;
    public string? DownloadUrl { get; set; }
}

public sealed class SavingsAccountAuthorizedSignerDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? DocumentType { get; set; }
    public string? DocumentNumber { get; set; }
    public string? Phone { get; set; }
    public string? RelationshipToCustomer { get; set; }
    public string? Address { get; set; }
    public decimal? AuthorizationLimit { get; set; }
    public string? Signature { get; set; }
    public string? PhotoUrl { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class SavingsCustomerSignatureDto
{
    public string SignatureData { get; set; } = string.Empty;
}

public sealed class SavingsTransactionListResponseDto
{
    public List<SavingsTransactionResponseDto> Transactions { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public sealed class SavingsTransactionResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public SavingsTransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public SavingsCurrency Currency { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Reference { get; set; }
    public string? ReceiptNumber { get; set; }
    public DateTime ProcessedAt { get; set; }
    public string? ProcessedByName { get; set; }
    public string? Description { get; set; }
}
