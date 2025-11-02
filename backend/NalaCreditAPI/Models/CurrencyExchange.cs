using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalaCreditAPI.Models
{
    public enum CurrencyType
    {
        HTG = 1, // Haitian Gourdes
        USD = 2  // US Dollar
    }

    public enum ExchangeType
    {
        Purchase = 1,  // Achte devises (HTG → USD)
        Sale = 2       // Vann devises (USD → HTG)
    }

    public enum ExchangeTransactionStatus
    {
        Pending = 1,
        Completed = 2,
        Cancelled = 3,
        Failed = 4
    }

    public enum RateUpdateMethod
    {
        Manual = 1,
        Automatic = 2
    }

    public class CurrencyExchangeRate
    {
        public Guid Id { get; set; }

        [Required]
        public CurrencyType BaseCurrency { get; set; } = CurrencyType.HTG;

        [Required]
        public CurrencyType TargetCurrency { get; set; } = CurrencyType.USD;

        [Required]
        [Column(TypeName = "decimal(18,6)")]
        public decimal BuyingRate { get; set; } // Taux d'achat

        [Required]
        [Column(TypeName = "decimal(18,6)")]
        public decimal SellingRate { get; set; } // Taux de vente

        [Required]
        public DateTime EffectiveDate { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [Required]
        public RateUpdateMethod UpdateMethod { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string UpdatedBy { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        // Navigation Properties
        public virtual ICollection<ExchangeTransaction> Transactions { get; set; } = new List<ExchangeTransaction>();
    }

    public class ExchangeTransaction
    {
        public Guid Id { get; set; }

        [Required]
        [StringLength(50)]
        public string TransactionNumber { get; set; } = string.Empty;

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(200)]
        public string BranchName { get; set; } = string.Empty;

        [Required]
        public Guid ExchangeRateId { get; set; }

        [Required]
        public ExchangeType ExchangeType { get; set; }

        [Required]
        public CurrencyType FromCurrency { get; set; }

        [Required]
        public CurrencyType ToCurrency { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal FromAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal ToAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,6)")]
        public decimal ExchangeRate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal CommissionAmount { get; set; }

        [Column(TypeName = "decimal(5,4)")]
        public decimal CommissionRate { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal NetAmount { get; set; } // Montant reçu par le client

        [StringLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [StringLength(50)]
        public string CustomerDocument { get; set; } = string.Empty;

        [StringLength(15)]
        public string CustomerPhone { get; set; } = string.Empty;

        [Required]
        public ExchangeTransactionStatus Status { get; set; }

        [Required]
        public DateTime TransactionDate { get; set; }

        [StringLength(100)]
        public string ProcessedBy { get; set; } = string.Empty;

        [StringLength(100)]
        public string ProcessedByName { get; set; } = string.Empty;

        [StringLength(100)]
        public string ApprovedBy { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        [StringLength(100)]
        public string ReceiptNumber { get; set; } = string.Empty;

        public bool ReceiptPrinted { get; set; } = false;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        // Navigation Properties
        public virtual CurrencyExchangeRate CurrencyRate { get; set; } = null!;
    }

    public class CurrencyReserve
    {
        public Guid Id { get; set; }

        [Required]
        public Guid BranchId { get; set; }

        [Required]
        [StringLength(200)]
        public string BranchName { get; set; } = string.Empty;

        [Required]
        public CurrencyType Currency { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentBalance { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MinimumBalance { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal MaximumBalance { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyLimit { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyUsed { get; set; }

        public DateTime LastRestockDate { get; set; }

        public DateTime LastDepositDate { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime UpdatedAt { get; set; }

        [Required]
        [StringLength(100)]
        public string UpdatedBy { get; set; } = string.Empty;

        // Navigation Properties
        public virtual ICollection<CurrencyMovement> CurrencyMovements { get; set; } = new List<CurrencyMovement>();
    }

    public enum CurrencyMovementType
    {
        Restock = 1,        // Approvisionnement
        Deposit = 2,        // Dépôt à la banque centrale
        Exchange = 3,       // Opération de change
        Adjustment = 4,     // Ajustement
        Transfer = 5        // Transfert entre succursales
    }

    public class CurrencyMovement
    {
        public Guid Id { get; set; }

        [Required]
        public Guid CurrencyReserveId { get; set; }

        [Required]
        public CurrencyMovementType MovementType { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceBefore { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceAfter { get; set; }

        [StringLength(100)]
        public string Reference { get; set; } = string.Empty;

        public Guid? ExchangeTransactionId { get; set; }

        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [StringLength(500)]
        public string Notes { get; set; } = string.Empty;

        [Required]
        public DateTime MovementDate { get; set; }

        [Required]
        [StringLength(100)]
        public string ProcessedBy { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string ProcessedByName { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; }

        // Navigation Properties
        public virtual CurrencyReserve CurrencyReserve { get; set; } = null!;
        public virtual ExchangeTransaction? ExchangeTransaction { get; set; }
    }
}