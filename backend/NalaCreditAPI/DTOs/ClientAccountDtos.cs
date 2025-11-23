using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.DTOs.ClientAccounts
{
    // DTOs pour CurrentAccount
    public class CurrentAccountOpeningDto
    {
        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public ClientCurrency Currency { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le dépôt initial doit être positif")]
        public decimal InitialDeposit { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Succursale invalide")]
        public int BranchId { get; set; }

        [Range(0, 1000000)]
        public decimal? MinimumBalance { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyWithdrawalLimit { get; set; }

        [Range(0, 50000000)]
        public decimal? MonthlyWithdrawalLimit { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyDepositLimit { get; set; }

        [Range(0, 100000)]
        public decimal? OverdraftLimit { get; set; }

        // New security/KYC fields
        [StringLength(10, MinimumLength = 4)]
        public string? Pin { get; set; }

        [StringLength(200)]
        public string? SecurityQuestion { get; set; }

        [StringLength(200)]
        public string? SecurityAnswer { get; set; }

        [StringLength(50)]
        public string? DepositMethod { get; set; }

        [StringLength(100)]
        public string? OriginOfFunds { get; set; }

        [StringLength(50)]
        public string? TransactionFrequency { get; set; }

        [StringLength(200)]
        public string? AccountPurpose { get; set; }

        public List<AuthorizedSignerDto>? AuthorizedSigners { get; set; }
    }

    public class CurrentAccountUpdateDto
    {
        [Required]
        public ClientAccountStatus Status { get; set; }

        [Range(0, 1000000)]
        public decimal? MinimumBalance { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyWithdrawalLimit { get; set; }

        [Range(0, 50000000)]
        public decimal? MonthlyWithdrawalLimit { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyDepositLimit { get; set; }

        [Range(0, 100000)]
        public decimal? OverdraftLimit { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }

    public class CurrentAccountResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public ClientCurrency Currency { get; set; }
        public decimal Balance { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal MinimumBalance { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        public ClientAccountStatus Status { get; set; }
        public decimal DailyWithdrawalLimit { get; set; }
        public decimal MonthlyWithdrawalLimit { get; set; }
        public decimal DailyDepositLimit { get; set; }
        public decimal OverdraftLimit { get; set; }
        public decimal MaintenanceFee { get; set; }
        public decimal TransactionFee { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }

        // Non-sensitive security/KYC snapshot
        public bool HasPin { get; set; }
        public string? SecurityQuestion { get; set; }
        public string? DepositMethod { get; set; }
        public string? OriginOfFunds { get; set; }
        public string? TransactionFrequency { get; set; }
        public string? AccountPurpose { get; set; }

        public List<AuthorizedSignerResponseDto> AuthorizedSigners { get; set; } = new();
    }

    public class AuthorizedSignerDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Role { get; set; }

        [StringLength(50)]
        public string? DocumentNumber { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }
    }

    public class AuthorizedSignerResponseDto : AuthorizedSignerDto
    {
        public string Id { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // DTOs pour TermSavingsAccount
    public class TermSavingsAccountOpeningDto
    {
        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public ClientCurrency Currency { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le dépôt initial doit être positif")]
        public decimal InitialDeposit { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Succursale invalide")]
        public int BranchId { get; set; }

        [Required]
        public TermSavingsType TermType { get; set; }

        [Range(0, 0.15, ErrorMessage = "Le taux d'intérêt ne peut pas dépasser 15%")]
        public decimal? InterestRate { get; set; }
    }

    public class TermSavingsAccountUpdateDto
    {
        [Required]
        public ClientAccountStatus Status { get; set; }

        [Range(0, 0.15)]
        public decimal? InterestRate { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }

    public class TermSavingsAccountResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public ClientCurrency Currency { get; set; }
        public decimal Balance { get; set; }
        public decimal AvailableBalance { get; set; }
        public TermSavingsType TermType { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime MaturityDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        public ClientAccountStatus Status { get; set; }
        public decimal InterestRate { get; set; }
        public decimal AccruedInterest { get; set; }
        public DateTime? LastInterestCalculation { get; set; }
        public decimal EarlyWithdrawalPenalty { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }
    }

    // DTOs pour les transactions
    public class TermSavingsTransactionDto
    {
        [Required]
        public string AccountNumber { get; set; } = string.Empty;

        [Required]
        public SavingsTransactionType Type { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal Amount { get; set; }

        [Required]
        public ClientCurrency Currency { get; set; }

        [StringLength(200)]
        public string? Description { get; set; }
    }

    public class CurrentAccountTransactionRequestDto
    {
        public string AccountNumber { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public ClientCurrency Currency { get; set; }
        public string? Description { get; set; }
        public bool? ClientPresent { get; set; }
        public string? VerificationMethod { get; set; }
        public string? Notes { get; set; }
    }

    // DTOs for transfers between current accounts
    public class CurrentAccountTransferRequestDto
    {
        [Required]
        public string SourceAccountNumber { get; set; } = string.Empty;

        [Required]
        public string DestinationAccountNumber { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le montant doit être positif")]
        public decimal Amount { get; set; }

        [Required]
        public ClientCurrency Currency { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        public bool? CustomerPresent { get; set; }
        [MaxLength(50)]
        public string? VerificationMethod { get; set; }
        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class CurrentAccountTransferResponseDto
    {
        public CurrentAccountTransactionResponseDto? SourceTransaction { get; set; }
        public CurrentAccountTransactionResponseDto? DestinationTransaction { get; set; }
    }

    public class CurrentAccountTransactionResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public ClientCurrency Currency { get; set; }
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
    }

    public class TermSavingsTransactionResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public ClientCurrency Currency { get; set; }
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
    }

    // DTOs pour les transactions unifiées
    public class ClientAccountTransactionResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountId { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public ClientAccountType AccountType { get; set; }
        public SavingsTransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public ClientCurrency Currency { get; set; }
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
    }

    // DTOs pour les filtres
    public class CurrentAccountFilterDto
    {
        public string? Search { get; set; }
        public ClientCurrency? Currency { get; set; }
        public ClientAccountStatus? Status { get; set; }
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

    public class TermSavingsAccountFilterDto
    {
        public string? Search { get; set; }
        public ClientCurrency? Currency { get; set; }
        public ClientAccountStatus? Status { get; set; }
        public TermSavingsType? TermType { get; set; }
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

    // DTOs pour les réponses paginées
    public class CurrentAccountListResponseDto
    {
        public List<CurrentAccountResponseDto> Accounts { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public CurrentAccountStatisticsDto Statistics { get; set; } = new();
    }

    public class TermSavingsAccountListResponseDto
    {
        public List<TermSavingsAccountResponseDto> Accounts { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public TermSavingsAccountStatisticsDto Statistics { get; set; } = new();
    }

    // DTO for renewing a term savings account
    public class TermSavingsAccountRenewDto
    {
        // Optional: renew into a different term
        public TermSavingsType? RenewalTermType { get; set; }

        // Optional: set auto-renew flag
        public bool? AutoRenew { get; set; }

        // Optional: override interest rate for the renewed term
        [Range(0, 0.15)]
        public decimal? InterestRate { get; set; }
    }

    // DTOs pour les statistiques
    public class CurrentAccountStatisticsDto
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

    public class TermSavingsAccountStatisticsDto
    {
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public decimal TotalBalanceHTG { get; set; }
        public decimal TotalBalanceUSD { get; set; }
        public decimal AverageBalance { get; set; }
        public Dictionary<string, int> AccountsByStatus { get; set; } = new();
        public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
        public Dictionary<string, int> AccountsByTermType { get; set; } = new();
        public int NewAccountsThisMonth { get; set; }
        public int DormantAccounts { get; set; }
        public int MaturedAccounts { get; set; }
    }

    // DTOs pour la gestion unifiée des comptes clients
    public class ClientAccountFilterDto
    {
        public ClientAccountType? AccountType { get; set; }
        public ClientCurrency? Currency { get; set; }
        public ClientAccountStatus? Status { get; set; }
        public int? BranchId { get; set; }
        public string? CustomerName { get; set; }
        public string? AccountNumber { get; set; }
        public decimal? MinBalance { get; set; }
        public decimal? MaxBalance { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? SortBy { get; set; } = "AccountNumber";
        public string? SortDirection { get; set; } = "asc";
    }

    public class ClientAccountCreationDto
    {
        [Required]
        public ClientAccountType AccountType { get; set; }

        [Required]
        public string CustomerId { get; set; } = string.Empty;

        [Required]
        public ClientCurrency Currency { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Le dépôt initial doit être positif")]
        public decimal InitialDeposit { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Succursale invalide")]
        public int BranchId { get; set; }

        // Pour les comptes d'épargne
        [Range(0, 0.15)]
        public decimal? InterestRate { get; set; }

        [Range(0, 1000000)]
        public decimal? MinimumBalance { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyWithdrawalLimit { get; set; }

        // Pour les comptes courants
        [Range(0, 50000000)]
        public decimal? MonthlyWithdrawalLimit { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyDepositLimit { get; set; }

        [Range(0, 100000)]
        public decimal? OverdraftLimit { get; set; }

        // Pour les épargnes à terme
        public TermSavingsType? TermType { get; set; }
    }

    public class ClientAccountUpdateDto
    {
        [Required]
        public ClientAccountStatus Status { get; set; }

        [Range(0, 0.15)]
        public decimal? InterestRate { get; set; }

        [Range(0, 1000000)]
        public decimal? MinimumBalance { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyWithdrawalLimit { get; set; }

        [Range(0, 50000000)]
        public decimal? MonthlyWithdrawalLimit { get; set; }

        [Range(0, 10000000)]
        public decimal? DailyDepositLimit { get; set; }

        [Range(0, 100000)]
        public decimal? OverdraftLimit { get; set; }

        [StringLength(500)]
        public string? Notes { get; set; }
    }

    public class ClientAccountResponseDto
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
        public DateTime OpeningDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        public ClientAccountStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
        public string? ClosedBy { get; set; }
        public string? ClosureReason { get; set; }

        // Propriétés spécifiques selon le type de compte
        public decimal? MinimumBalance { get; set; }
        public decimal? DailyWithdrawalLimit { get; set; }
        public decimal? MonthlyWithdrawalLimit { get; set; }
        public decimal? DailyDepositLimit { get; set; }
        public decimal? OverdraftLimit { get; set; }
        public decimal? InterestRate { get; set; }
        public TermSavingsType? TermType { get; set; }
        public DateTime? MaturityDate { get; set; }
        public decimal? AccruedInterest { get; set; }
    }

    public class ClientAccountSummary
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public ClientAccountType AccountType { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public ClientCurrency Currency { get; set; }
        public decimal Balance { get; set; }
        public ClientAccountStatus Status { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? LastTransactionDate { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
    }

    public class ClientAccountListResponseDto
    {
        public List<ClientAccountSummary> Accounts { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public ClientAccountStatistics Statistics { get; set; } = new();
    }

    public class ClientAccountStatistics
    {
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public decimal TotalBalanceHTG { get; set; }
        public decimal TotalBalanceUSD { get; set; }
        public decimal AverageBalance { get; set; }
        public Dictionary<string, int> AccountsByType { get; set; } = new();
        public Dictionary<string, int> AccountsByStatus { get; set; } = new();
        public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
        public int NewAccountsThisMonth { get; set; }
        public int DormantAccounts { get; set; }
    }

    // DTOs pour l'historique des transactions
    public class TransactionHistoryFilterDto
    {
        public SavingsTransactionType? Type { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
        public string? Reference { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? SortBy { get; set; } = "ProcessedAt";
        public string? SortDirection { get; set; } = "desc";
    }

    public class ClientAccountTransactionHistoryDto
    {
        public List<ClientAccountTransactionResponseDto> Transactions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public decimal TotalCredits { get; set; }
        public decimal TotalDebits { get; set; }
        public int TransactionCount { get; set; }
    }

    // DTOs pour les statistiques détaillées
    public class ClientAccountStatisticsDto
    {
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public decimal TotalBalanceHTG { get; set; }
        public decimal TotalBalanceUSD { get; set; }
        public decimal AverageBalance { get; set; }
        public Dictionary<string, int> AccountsByType { get; set; } = new();
        public Dictionary<string, int> AccountsByStatus { get; set; } = new();
        public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
        public int NewAccountsThisMonth { get; set; }
        public int DormantAccounts { get; set; }
    }

    public class ClientAccountTypeStatisticsDto
    {
        public Dictionary<string, int> AccountsByType { get; set; } = new();
        public Dictionary<string, decimal> BalanceByType { get; set; } = new();
        public Dictionary<string, int> NewAccountsByTypeThisMonth { get; set; } = new();
    }

    public class ClientAccountCurrencyStatisticsDto
    {
        public Dictionary<string, int> AccountsByCurrency { get; set; } = new();
        public Dictionary<string, decimal> BalanceByCurrency { get; set; } = new();
        public Dictionary<string, int> NewAccountsByCurrencyThisMonth { get; set; } = new();
    }

    // DTOs pour la recherche
    public class ClientAccountSearchDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string Query { get; set; } = string.Empty;

        public ClientAccountType? AccountType { get; set; }
        public ClientCurrency? Currency { get; set; }
        public ClientAccountStatus? Status { get; set; }
        public int? BranchId { get; set; }
        public int MaxResults { get; set; } = 50;
    }

    public class ClientAccountSearchResponseDto
    {
        public List<ClientAccountSummary> Results { get; set; } = new();
        public int TotalCount { get; set; }
        public string Query { get; set; } = string.Empty;
        public TimeSpan SearchTime { get; set; }
    }

    // DTOs utilitaires
    public class ClientAccountBalanceDto
    {
        public decimal Current { get; set; }
        public decimal Available { get; set; }
        public ClientCurrency Currency { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class CloseAccountDto
    {
        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        /// <summary>
        /// Pourcentage de pénalité pour retrait anticipé (optionnel).
        /// Si fourni, applique une pénalité sur le solde avant fermeture.
        /// </summary>
        [Range(0, 100)]
        public decimal? EarlyWithdrawalPenaltyPercent { get; set; }
    }

    public class UpdateAccountStatusDto
    {
        [Required]
        public bool IsActive { get; set; }
    }

    // DTOs for pending account validations
    public class ClientAccountPendingDto
    {
        public string Id { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public string AccountType { get; set; } = string.Empty;
        public string SubmittedBy { get; set; } = string.Empty;
        public string SubmittedDate { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public int BranchId { get; set; }
    }

    public class ValidateAccountDto
    {
        [Required]
        public bool Approved { get; set; }

        [StringLength(500)]
        public string? RejectionReason { get; set; }
    }
}