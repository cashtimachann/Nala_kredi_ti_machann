using System.ComponentModel.DataAnnotations;
using NalaCreditAPI.Models;
using NalaCreditAPI.Utilities;

namespace NalaCreditAPI.DTOs
{
    public class CurrencyExchangeRateDto
    {
        public Guid Id { get; set; }
        public int? BranchId { get; set; }
        public string? BranchName { get; set; }
        public CurrencyType BaseCurrency { get; set; }
        public string BaseCurrencyName { get; set; } = string.Empty;
        public CurrencyType TargetCurrency { get; set; }
        public string TargetCurrencyName { get; set; } = string.Empty;
        public decimal BuyingRate { get; set; }
        public decimal SellingRate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public RateUpdateMethod UpdateMethod { get; set; }
        public string UpdateMethodName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string Notes { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public string UpdatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateExchangeRateDto
    {
        public string? BranchId { get; set; } // Optional: Branch-specific rate

        [Required]
        public CurrencyType BaseCurrency { get; set; } = CurrencyType.HTG;

        [Required]
        public CurrencyType TargetCurrency { get; set; } = CurrencyType.USD;

        [Required]
        [Range(0.000001, double.MaxValue, ErrorMessage = "Buying rate must be greater than 0")]
        public decimal BuyingRate { get; set; }

        [Required]
        [Range(0.000001, double.MaxValue, ErrorMessage = "Selling rate must be greater than 0")]
        public decimal SellingRate { get; set; }

        [Required]
        public DateTime EffectiveDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [Required]
        public RateUpdateMethod UpdateMethod { get; set; } = RateUpdateMethod.Manual;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class UpdateExchangeRateDto
    {
        [Required]
        [Range(0.000001, double.MaxValue, ErrorMessage = "Buying rate must be greater than 0")]
        public decimal BuyingRate { get; set; }

        [Required]
        [Range(0.000001, double.MaxValue, ErrorMessage = "Selling rate must be greater than 0")]
        public decimal SellingRate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class ExchangeRateSearchDto
    {
        public CurrencyType? BaseCurrency { get; set; }
        public CurrencyType? TargetCurrency { get; set; }
        public bool? IsActive { get; set; }
        public DateTime? EffectiveDateFrom { get; set; }
        public DateTime? EffectiveDateTo { get; set; }
        public string? BranchId { get; set; } // Can be integer or Guid string
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class ExchangeTransactionDto
    {
        public Guid Id { get; set; }
        public string TransactionNumber { get; set; } = string.Empty;
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public Guid ExchangeRateId { get; set; }
        public ExchangeType ExchangeType { get; set; }
        public string ExchangeTypeName { get; set; } = string.Empty;
        public CurrencyType FromCurrency { get; set; }
        public string FromCurrencyName { get; set; } = string.Empty;
        public CurrencyType ToCurrency { get; set; }
        public string ToCurrencyName { get; set; } = string.Empty;
        public decimal FromAmount { get; set; }
        public decimal ToAmount { get; set; }
        public decimal ExchangeRate { get; set; }
        public decimal CommissionAmount { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal NetAmount { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerDocument { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public ExchangeTransactionStatus Status { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public DateTime TransactionDate { get; set; }
        public string ProcessedBy { get; set; } = string.Empty;
        public string ProcessedByName { get; set; } = string.Empty;
        public string ApprovedBy { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public bool ReceiptPrinted { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateExchangeTransactionDto
    {
        public string? BranchId { get; set; }

        [Required]
        public ExchangeType ExchangeType { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [StringLength(200, MinimumLength = 1, ErrorMessage = "Customer name must be between 1 and 200 characters")]
        public string CustomerName { get; set; } = "Client";

        [StringLength(50)]
        public string CustomerDocument { get; set; } = string.Empty;

        [StringLength(15)]
        public string CustomerPhone { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class ExchangeCalculationDto
    {
        public string? BranchId { get; set; }

        [Required]
        public ExchangeType ExchangeType { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }
    }

    public class ExchangeCalculationResultDto
    {
        public ExchangeType ExchangeType { get; set; }
        public string ExchangeTypeName { get; set; } = string.Empty;
        public CurrencyType FromCurrency { get; set; }
        public string FromCurrencyName { get; set; } = string.Empty;
        public CurrencyType ToCurrency { get; set; }
        public string ToCurrencyName { get; set; } = string.Empty;
        public decimal FromAmount { get; set; }
        public decimal ExchangeRate { get; set; }
        public decimal ToAmount { get; set; }
        public decimal CommissionRate { get; set; }
        public decimal CommissionAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal AvailableBalance { get; set; }
        public bool IsValid { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public class ExchangeTransactionSearchDto
    {
        public string? BranchId { get; set; }
        public ExchangeType? ExchangeType { get; set; }
        public CurrencyType? FromCurrency { get; set; }
        public CurrencyType? ToCurrency { get; set; }
        public ExchangeTransactionStatus? Status { get; set; }
        public DateTime? TransactionDateFrom { get; set; }
        public DateTime? TransactionDateTo { get; set; }
        public string? CustomerName { get; set; }
        public string? TransactionNumber { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        // When true, the API should not restrict to current user's branch
        public bool? IncludeAll { get; set; }

        public Guid? BranchGuid
        {
            get
            {
                return BranchIntegrationHelper.TryParseBranchGuid(BranchId, out var branchGuid, out _)
                    ? branchGuid
                    : null;
            }
        }
    }

    public class CurrencyReserveDto
    {
        public Guid Id { get; set; }
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public CurrencyType Currency { get; set; }
        public string CurrencyName { get; set; } = string.Empty;
        public decimal CurrentBalance { get; set; }
        public decimal MinimumBalance { get; set; }
        public decimal MaximumBalance { get; set; }
        public decimal DailyLimit { get; set; }
        public decimal DailyUsed { get; set; }
        public decimal DailyRemaining => DailyLimit - DailyUsed;
        public DateTime LastRestockDate { get; set; }
        public DateTime LastDepositDate { get; set; }
        public bool IsActive { get; set; }
        public bool IsLowBalance => CurrentBalance <= MinimumBalance;
        public string Notes { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string UpdatedBy { get; set; } = string.Empty;
    }

    public class UpdateCurrencyReserveDto
    {
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Minimum balance must be greater than or equal to 0")]
        public decimal MinimumBalance { get; set; }

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Maximum balance must be greater than or equal to 0")]
        public decimal MaximumBalance { get; set; }

        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Daily limit must be greater than or equal to 0")]
        public decimal DailyLimit { get; set; }

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class CurrencyMovementDto
    {
        public Guid Id { get; set; }
        public Guid CurrencyReserveId { get; set; }
        public CurrencyType Currency { get; set; }
        public string CurrencyName { get; set; } = string.Empty;
        public CurrencyMovementType MovementType { get; set; }
        public string MovementTypeName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Reference { get; set; } = string.Empty;
        public Guid? ExchangeTransactionId { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime MovementDate { get; set; }
        public string ProcessedBy { get; set; } = string.Empty;
        public string ProcessedByName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreateCurrencyMovementDto
    {
        [Required]
        public Guid CurrencyReserveId { get; set; }

        [Required]
        public CurrencyMovementType MovementType { get; set; }

        [Required]
        [Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than 0")]
        public decimal Amount { get; set; }

        [StringLength(100)]
        public string Reference { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;
    }

    public class CurrencyExchangeSummaryDto
    {
        public Guid BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public DateTime ReportDate { get; set; }
        public decimal HTGBalance { get; set; }
        public decimal USDBalance { get; set; }
        public int TotalTransactions { get; set; }
        public decimal TotalHTGSold { get; set; }
        public decimal TotalUSDSold { get; set; }
        public decimal TotalCommissionEarned { get; set; }
        public decimal HTGDailyLimit { get; set; }
        public decimal HTGDailyUsed { get; set; }
        public decimal USDDailyLimit { get; set; }
        public decimal USDDailyUsed { get; set; }
    }
}