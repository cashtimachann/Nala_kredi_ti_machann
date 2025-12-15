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

public sealed class SavingsAccountInfo
{
    public string Id { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public SavingsCustomerInfo? Customer { get; set; }
    public int BranchId { get; set; }
    public string? BranchName { get; set; }
    public SavingsCurrency Currency { get; set; }
    public decimal Balance { get; set; }
    public decimal AvailableBalance { get; set; }
    public decimal BlockedBalance { get; set; }
    public SavingsAccountLimitsInfo? AccountLimits { get; set; }
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

public sealed class SavingsAccountLimitsInfo
{
    public decimal DailyWithdrawalLimit { get; set; }
    public decimal DailyDepositLimit { get; set; }
    public decimal MonthlyWithdrawalLimit { get; set; }
    public decimal MaxBalance { get; set; }
    public decimal MinWithdrawalAmount { get; set; }
    public decimal MaxWithdrawalAmount { get; set; }
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
