using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace NalaCreditDesktop.Models
{
    public enum MicrocreditPaymentMethod
    {
        Cash = 0,
        BankTransfer = 1,
        MobileMoney = 2,
        Check = 3,
        Card = 4
    }

    public enum MicrocreditCurrency
    {
        HTG = 0,
        USD = 1
    }

    public enum MicrocreditLoanType
    {
        Commercial = 0,
        Agricultural = 1,
        Personal = 2,
        Emergency = 3,
        CreditLoyer = 4,
        CreditAuto = 5,
        CreditMoto = 6,
        CreditPersonnel = 7,
        CreditScolaire = 8,
        CreditAgricole = 9,
        CreditProfessionnel = 10,
        CreditAppui = 11,
        CreditHypothecaire = 12
    }

    public class MicrocreditLoan
    {
        public Guid Id { get; set; }
        [JsonProperty("applicationId")]
        public Guid ApplicationId { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string BorrowerName { get; set; } = string.Empty;
        public string? BorrowerFirstName { get; set; }
        public string? BorrowerLastName { get; set; }
        public string? BorrowerPhone { get; set; }
        public MicrocreditBorrower? Borrower { get; set; }
        [JsonProperty("requestedAmount")]
        public decimal RequestedAmount { get; set; }
        [JsonProperty("approvedAmount")]
        public decimal ApprovedAmount { get; set; }
        [JsonProperty("principalAmount")]
        public decimal PrincipalAmount { get; set; }
        [JsonProperty("interestRate")]
        public decimal InterestRate { get; set; }
        [JsonProperty("monthlyInterestRate")]
        public decimal? MonthlyInterestRate { get; set; }
        [JsonProperty("durationMonths")]
        public int DurationMonths { get; set; }
        [JsonProperty("termMonths")]
        public int TermMonths { get; set; }
        public decimal InstallmentAmount { get; set; }
        public decimal MonthlyPayment { get; set; }
        public string Currency { get; set; } = "HTG";
        public decimal OutstandingBalance { get; set; }
        public decimal RemainingBalance { get; set; }
        public decimal AmountPaid { get; set; }
        public decimal? PaidAmount { get; set; } // API uses paidAmount
        public decimal InterestPaid { get; set; }
        public decimal OutstandingPrincipal { get; set; }
        public decimal OutstandingInterest { get; set; }
        public int DaysOverdue { get; set; }
        public string? Status { get; set; }
        public string? LoanType { get; set; }
        public int PaymentsMade { get; set; }
        public int InstallmentsPaid { get; set; }
        public DateTime? NextPaymentDate { get; set; }
        // Backend uses 'nextPaymentDue' (DateOnly). Capture as raw string for safe parsing.
        [JsonProperty("nextPaymentDue")] public string? NextPaymentDueRaw { get; set; }
        // Payment schedule (optional, may be included in detailed loan responses)
        public List<MicrocreditPaymentScheduleDto>? PaymentSchedule { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? DisbursementDate { get; set; }
        [JsonProperty("firstInstallmentDate")]
        public DateTime? FirstInstallmentDate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string LoanOfficerId { get; set; } = string.Empty;
        public string LoanOfficerName { get; set; } = string.Empty;
        
        // Calculated penalty amount (0.11667% per day on principal)
        [JsonIgnore]
        public decimal PenaltyAmount => DaysOverdue > 0 ? PrincipalAmount * 0.0011667m * DaysOverdue : 0;
    }

    public class MicrocreditBorrower
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string CustomerNumber { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        
        // Address can be either string or object depending on API response
        [JsonProperty("address")]
        private object? _addressRaw { get; set; }
        
        [JsonIgnore]
        public string? Address
        {
            get
            {
                if (_addressRaw == null) return null;
                if (_addressRaw is string str) return str;
                // When deserialized as JObject, convert to DTO then format
                if (_addressRaw is JObject jObj)
                {
                    try
                    {
                        var dto = jObj.ToObject<BorrowerAddressDto>();
                        if (dto != null)
                        {
                            AddressObject = dto;
                            var parts = new List<string>();
                            if (!string.IsNullOrWhiteSpace(dto.Street)) parts.Add(dto.Street);
                            if (!string.IsNullOrWhiteSpace(dto.City)) parts.Add(dto.City);
                            if (!string.IsNullOrWhiteSpace(dto.State)) parts.Add(dto.State);
                            if (!string.IsNullOrWhiteSpace(dto.PostalCode)) parts.Add(dto.PostalCode);
                            if (!string.IsNullOrWhiteSpace(dto.Country)) parts.Add(dto.Country);
                            return parts.Count > 0 ? string.Join(", ", parts) : null;
                        }
                    }
                    catch { /* fall through */ }
                    return null;
                }
                if (_addressRaw is BorrowerAddressDto addr)
                {
                    AddressObject = addr;
                    var parts = new List<string>();
                    if (!string.IsNullOrWhiteSpace(addr.Street)) parts.Add(addr.Street);
                    if (!string.IsNullOrWhiteSpace(addr.City)) parts.Add(addr.City);
                    if (!string.IsNullOrWhiteSpace(addr.State)) parts.Add(addr.State);
                    if (!string.IsNullOrWhiteSpace(addr.PostalCode)) parts.Add(addr.PostalCode);
                    if (!string.IsNullOrWhiteSpace(addr.Country)) parts.Add(addr.Country);
                    return parts.Count > 0 ? string.Join(", ", parts) : null;
                }
                // Unknown object type: avoid dumping raw JSON
                return null;
            }
        }
        
        public BorrowerAddressDto? AddressObject { get; set; }
        public BorrowerContactDto? Contact { get; set; }
        public string? Occupation { get; set; }
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
        [JsonIgnore]
        public string Phone => PrimaryPhone;
        
        [JsonIgnore]
        public string PhoneNumber => PrimaryPhone;
    }

    public class MicrocreditLoanListResponse
    {
        public List<MicrocreditLoan> Loans { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
    }

    public class OverdueLoan
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

    public class LoanSummary
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
        public string Status { get; set; } = string.Empty;
    }

    public class CreateMicrocreditPaymentRequest
    {
        public Guid LoanId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.Now;
        public MicrocreditPaymentMethod PaymentMethod { get; set; } = MicrocreditPaymentMethod.Cash;
        public string? Reference { get; set; }
        public string? Notes { get; set; }
    }

    public class MicrocreditPayment
    {
        public Guid Id { get; set; }
        public string PaymentNumber { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal PenaltyAmount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string? Reference { get; set; }
        public string ProcessedBy { get; set; } = string.Empty;
        public string ProcessedByName { get; set; } = string.Empty;
        public int BranchId { get; set; }
        public string BranchName { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? ReceiptPath { get; set; }
        public string? LoanNumber { get; set; }
        public string? CustomerName { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class PaymentReceipt
    {
        public string ReceiptNumber { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public string BorrowerName { get; set; } = string.Empty;
        public string LoanNumber { get; set; } = string.Empty;
        public decimal PaymentAmount { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
        public string ReceivedBy { get; set; } = string.Empty;
        public string BranchName { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
    }

    public class CreateMicrocreditLoanApplicationDto
    {
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public MicrocreditLoanType LoanType { get; set; }
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? BusinessPlan { get; set; }
        public MicrocreditCurrency Currency { get; set; }
        public int BranchId { get; set; }
        public string? CustomerName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? CustomerAddress { get; set; }
        public string? Occupation { get; set; }
        public decimal MonthlyIncome { get; set; }
        public decimal MonthlyExpenses { get; set; }
        public decimal ExistingDebts { get; set; }
        public decimal? CollateralValue { get; set; }
        public int Dependents { get; set; }
        public decimal InterestRate { get; set; }
        public decimal MonthlyInterestRate { get; set; }
        public string? CollateralType { get; set; }
        public string? CollateralDescription { get; set; }
        public string? Guarantor1Name { get; set; }
        public string? Guarantor1Phone { get; set; }
        public string? Guarantor1Relation { get; set; }
        public string? Guarantor2Name { get; set; }
        public string? Guarantor2Phone { get; set; }
        public string? Guarantor2Relation { get; set; }
        public string? Reference1Name { get; set; }
        public string? Reference1Phone { get; set; }
        public string? Reference2Name { get; set; }
        public string? Reference2Phone { get; set; }
        public bool HasNationalId { get; set; }
        public bool HasProofOfResidence { get; set; }
        public bool HasProofOfIncome { get; set; }
        public bool HasCollateralDocs { get; set; }
        public string? Notes { get; set; }
    }

    // Custom converter to handle inconsistent loan type strings from API
    public class MicrocreditLoanTypeConverter : JsonConverter<MicrocreditLoanType>
    {
        public override MicrocreditLoanType ReadJson(JsonReader reader, Type objectType, MicrocreditLoanType existingValue, bool hasExistingValue, JsonSerializer serializer)
        {
            if (reader.TokenType == JsonToken.Integer)
            {
                try
                {
                    var intVal = Convert.ToInt32(reader.Value);
                    if (Enum.IsDefined(typeof(MicrocreditLoanType), intVal))
                        return (MicrocreditLoanType)intVal;
                }
                catch { }
                return MicrocreditLoanType.Personal;
            }

            if (reader.TokenType == JsonToken.String)
            {
                var s = (reader.Value?.ToString() ?? string.Empty).Trim();
                if (string.IsNullOrEmpty(s)) return MicrocreditLoanType.Personal;

                // Normalize
                var key = s.Replace("é", "e").Replace("É", "E").Replace("’", "'").ToLowerInvariant();

                // Map common web labels to enum values
                return key switch
                {
                    "emergency" or "urgence" => MicrocreditLoanType.Emergency,
                    "personal" => MicrocreditLoanType.Personal,
                    "business" or "commercial" => MicrocreditLoanType.Commercial,
                    "agricultural" or "agriculture" or "agricole" => MicrocreditLoanType.Agricultural,
                    "education" or "scolaire" or "creditscolaire" => MicrocreditLoanType.CreditScolaire,
                    "housing" or "logement" or "credithypothecaire" or "hypothecaire" => MicrocreditLoanType.CreditHypothecaire,
                    "rent" or "loyer" or "creditloyer" => MicrocreditLoanType.CreditLoyer,
                    "auto" or "car" or "creditauto" => MicrocreditLoanType.CreditAuto,
                    "moto" or "motorcycle" or "creditmoto" => MicrocreditLoanType.CreditMoto,
                    "personnel" or "creditpersonnel" => MicrocreditLoanType.CreditPersonnel,
                    "professionnel" or "creditprofessionnel" => MicrocreditLoanType.CreditProfessionnel,
                    "creditagricole" => MicrocreditLoanType.CreditAgricole,
                    "appui" or "creditappui" => MicrocreditLoanType.CreditAppui,
                    _ => MicrocreditLoanType.Personal
                };
            }

            // Fallback
            return MicrocreditLoanType.Personal;
        }

        public override void WriteJson(JsonWriter writer, MicrocreditLoanType value, JsonSerializer serializer)
        {
            writer.WriteValue(value.ToString());
        }
    }

    public class MicrocreditLoanApplicationDto
    {
        public Guid Id { get; set; }
        public string ApplicationNumber { get; set; } = string.Empty;
        public string SavingsAccountNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerPhone { get; set; }
        public string? CustomerEmail { get; set; }
        
        // Aliases for backward compatibility
        public string? Phone => CustomerPhone;
        public string? Email => CustomerEmail;
        
        public string? CustomerAddress { get; set; }
        public string? Occupation { get; set; }
        [JsonConverter(typeof(MicrocreditLoanTypeConverter))]
        public MicrocreditLoanType LoanType { get; set; }
        public decimal RequestedAmount { get; set; }
        public int RequestedDurationMonths { get; set; }
        public string Purpose { get; set; } = string.Empty;
        public string? BusinessPlan { get; set; }
        public MicrocreditCurrency Currency { get; set; }
        public int BranchId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal MonthlyIncome { get; set; }
        public decimal MonthlyExpenses { get; set; }
        public decimal ExistingDebts { get; set; }
        public decimal? CollateralValue { get; set; }
        public decimal InterestRate { get; set; }
        public decimal MonthlyInterestRate { get; set; }
        public string? CollateralType { get; set; }
        public string? CollateralDescription { get; set; }
        public string? Guarantor1Name { get; set; }
        public string? Guarantor1Phone { get; set; }
        public string? Guarantor1Relation { get; set; }
        public string? Guarantor2Name { get; set; }
        public string? Guarantor2Phone { get; set; }
        public string? Guarantor2Relation { get; set; }
        public string? Reference1Name { get; set; }
        public string? Reference1Phone { get; set; }
        public string? Reference2Name { get; set; }
        public string? Reference2Phone { get; set; }
        public bool HasNationalId { get; set; }
        public bool HasProofOfResidence { get; set; }
        public bool HasProofOfIncome { get; set; }
        public bool HasCollateralDocs { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public DateTime? DisbursementDate { get; set; }
    }

    public class MicrocreditApplicationListResponseDto
    {
        public List<MicrocreditLoanApplicationDto> Applications { get; set; } = new List<MicrocreditLoanApplicationDto>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class ApproveMicrocreditApplicationDto
    {
        public decimal ApprovedAmount { get; set; }
        public decimal InterestRate { get; set; }
        public int DurationMonths { get; set; }
        public DateTime DisbursementDate { get; set; }
        public string? Comments { get; set; }
    }

    public class RejectMicrocreditApplicationDto
    {
        public string RejectionReason { get; set; } = string.Empty;
        public string Comments { get; set; } = string.Empty;
    }

    public class PaymentHistoryResponse
    {
        public List<MicrocreditPayment> Payments { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class MicrocreditPaymentScheduleDto
    {
        public Guid Id { get; set; }
        public int InstallmentNumber { get; set; }
        public DateOnly DueDate { get; set; }
        public decimal PrincipalAmount { get; set; }
        public decimal InterestAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal? FeePortion { get; set; }
        public decimal? TotalAmountWithFee { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? PaidAmount { get; set; }
        public DateOnly? PaidDate { get; set; }
        public int? DaysOverdue { get; set; }
        public decimal? PenaltyAmount { get; set; }
        public decimal RemainingBalance { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
