namespace NalaCreditAPI.DTOs
{
    public class BranchDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Commune { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public List<string> Phones { get; set; } = new List<string>();
        public string Email { get; set; } = string.Empty;
        public string OpeningDate { get; set; } = string.Empty;
        public string? ManagerId { get; set; }
        public string? ManagerName { get; set; }
        public int MaxEmployees { get; set; }
        public string Status { get; set; } = string.Empty;
        public BranchLimitsDto Limits { get; set; } = new BranchLimitsDto();
        public OperatingHoursDto OperatingHours { get; set; } = new OperatingHoursDto();
        public string CreatedAt { get; set; } = string.Empty;
        public string UpdatedAt { get; set; } = string.Empty;
    }

    public class CreateBranchDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string Address { get; set; } = string.Empty;
        public string Commune { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public List<string> Phones { get; set; } = new List<string>();
        public string Email { get; set; } = string.Empty;
        [System.ComponentModel.DataAnnotations.RegularExpression("^\\d{4}-\\d{2}-\\d{2}$", ErrorMessage = "OpeningDate doit être au format yyyy-MM-dd")]
        public string OpeningDate { get; set; } = string.Empty;
        public string? ManagerId { get; set; }
        public int MaxEmployees { get; set; }
        public string Status { get; set; } = string.Empty;
        public BranchLimitsDto Limits { get; set; } = new BranchLimitsDto();
        public OperatingHoursDto OperatingHours { get; set; } = new OperatingHoursDto();
    }

    public class UpdateBranchDto : CreateBranchDto
    {
        public int Id { get; set; }
    }

    public class BranchLimitsDto
    {
        public decimal DailyWithdrawalLimit { get; set; }
        public decimal DailyDepositLimit { get; set; }
        public decimal MaxLocalCreditApproval { get; set; }
        public decimal MinCashReserveHTG { get; set; }
        public decimal MinCashReserveUSD { get; set; }
    }

    public class OperatingHoursDto
    {
        public string OpenTime { get; set; } = string.Empty;
        public string CloseTime { get; set; } = string.Empty;
        public List<int> ClosedDays { get; set; } = new List<int>();
    }

    public class BranchHistoryDto
    {
        public int Id { get; set; }
        public int BranchId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public string PerformedAt { get; set; } = string.Empty;
        public object? OldValue { get; set; }
        public object? NewValue { get; set; }
    }

    public class GenerateCodeDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class GenerateCodeResponseDto
    {
        public string Code { get; set; } = string.Empty;
    }

    public class ValidateCodeDto
    {
        public string Code { get; set; } = string.Empty;
    }

    public class ValidateCodeResponseDto
    {
        public bool IsValid { get; set; }
    }

    public class AssignManagerDto
    {
        public string ManagerId { get; set; } = string.Empty;
    }

    public class BranchFinancialSummaryDto
    {
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public decimal TotalDepositHTG { get; set; }
        public decimal TotalWithdrawalHTG { get; set; }
        public decimal BalanceHTG { get; set; }
        public decimal TotalDepositUSD { get; set; }
        public decimal TotalWithdrawalUSD { get; set; }
        public decimal BalanceUSD { get; set; }
        public int TotalTransactions { get; set; }
        public DateTime LastTransactionDate { get; set; }
    }
}
