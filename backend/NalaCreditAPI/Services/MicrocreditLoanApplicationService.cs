using NalaCreditAPI.Models;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace NalaCreditAPI.Services
{
    public interface IMicrocreditLoanApplicationService
    {
        // Gestion des demandes de crédit
        Task<MicrocreditLoanApplicationDto?> GetApplicationAsync(Guid id);
        Task<MicrocreditApplicationListResponseDto> GetApplicationsAsync(
            int page = 1, 
            int pageSize = 10, 
            MicrocreditApplicationStatus? status = null,
            MicrocreditLoanType? loanType = null,
            int? branchId = null);
        Task<MicrocreditLoanApplicationDto> CreateApplicationAsync(CreateMicrocreditLoanApplicationDto dto, string userId);
        Task<MicrocreditLoanApplicationDto> UpdateApplicationAsync(Guid id, CreateMicrocreditLoanApplicationDto dto);
        Task<MicrocreditLoanApplicationDto> SubmitApplicationAsync(Guid id);
        Task<MicrocreditLoanApplicationDto> ReviewApplicationAsync(Guid id, string reviewerId, string comments);
        Task<MicrocreditLoanApplicationDto> ApproveApplicationAsync(Guid id, string approverId, string comments, decimal? approvedAmount = null, DateTime? disbursementDate = null);
        Task<MicrocreditLoanApplicationDto> RejectApplicationAsync(Guid id, string rejectedBy, string reason);
        Task<MicrocreditLoanApplicationDto> CancelApplicationAsync(Guid id, string cancelledBy, string reason);
        Task<RiskAssessmentDto> CalculateRiskAssessmentAsync(Guid applicationId);
        Task<bool> ValidateApplicationAsync(Guid id);

        // Gestion des prêts
        Task<MicrocreditLoanDto?> GetLoanAsync(Guid id);
        Task<MicrocreditLoanListResponseDto> GetLoansAsync(int page, int pageSize, 
            MicrocreditLoanStatus? status = null, MicrocreditLoanType? loanType = null, 
            int? branchId = null, bool? isOverdue = null);
        Task<List<MicrocreditLoanDto>> GetCustomerLoansAsync(Guid customerId);
        Task<List<MicrocreditLoanDto>> GetLoansByApplicationIdsAsync(List<Guid> applicationIds);
        Task<MicrocreditLoanDto> DisburseLoanAsync(Guid loanId, string disbursedBy, DateTime disbursementDate, string? notes = null);
        Task<List<MicrocreditPaymentScheduleDto>> GetPaymentScheduleAsync(Guid loanId);
        Task<MicrocreditCollectionNoteDto> AddCollectionNoteAsync(Guid loanId, CreateMicrocreditCollectionNoteDto dto, string createdBy);
        Task<List<MicrocreditCollectionNoteDto>> GetCollectionNotesAsync(Guid loanId);
        Task<MicrocreditLoanDto> MarkLoanAsDefaultAsync(Guid loanId, string markedBy, string reason);
        Task<MicrocreditLoanDto> RehabilitateLoanAsync(Guid loanId, string rehabilitatedBy, string? notes = null);
        Task<LoanSummaryDto?> GetLoanSummaryAsync(Guid loanId);
        Task<List<MicrocreditPaymentDto>> GetLoanTransactionsAsync(Guid loanId);
        Task<List<OverdueLoanDto>> GetOverdueLoansAsync(int daysOverdue = 1);
        Task UpdateOverdueLoansAsync(); // Background job to update overdue status

        // Gestion des paiements
        Task<MicrocreditPaymentDto?> GetPaymentAsync(Guid id);
        Task<MicrocreditPaymentDto> RecordPaymentAsync(CreateMicrocreditPaymentDto dto, string recordedBy);
        Task<List<MicrocreditPaymentDto>> GetLoanPaymentsAsync(Guid loanId);
        Task<MicrocreditPaymentDto> ConfirmPaymentAsync(Guid paymentId, string confirmedBy, string? notes = null);
        Task<MicrocreditPaymentDto> CancelPaymentAsync(Guid paymentId, string cancelledBy, string reason);
        Task<List<MicrocreditPaymentDto>> GetPendingPaymentsAsync(int? branchId = null);
        Task<PaymentHistoryResponseDto> GetPaymentHistoryAsync(int page, int pageSize, 
            DateTime? fromDate = null, DateTime? toDate = null, 
            MicrocreditPaymentStatus? status = null, int? branchId = null);
        Task<PaymentStatisticsDto> GetPaymentStatisticsAsync(DateTime? fromDate = null, 
            DateTime? toDate = null, int? branchId = null);
        Task<PaymentReceiptDto?> GeneratePaymentReceiptAsync(Guid paymentId);
        Task<MicrocreditPaymentDto> ProcessEarlyPayoffAsync(EarlyPayoffDto dto, string processedBy);

        // Dashboard methods
        Task<MicrocreditDashboardStatsDto> GetDashboardStatsAsync(int? branchId = null);
        Task<List<AgentPerformanceDto>> GetAgentPerformanceAsync(int? branchId = null, int months = 6);
        Task<List<PortfolioTrendDto>> GetPortfolioTrendAsync(int? branchId = null, int months = 12);

        // Document management methods
        Task<MicrocreditApplicationDocumentDto> UploadDocumentAsync(Guid applicationId, IFormFile file, MicrocreditDocumentType documentType, string uploadedBy, string? description = null);
        Task<List<MicrocreditApplicationDocumentDto>> GetApplicationDocumentsAsync(Guid applicationId);
        Task DeleteDocumentAsync(Guid documentId, string deletedBy);
    }

    public class MicrocreditLoanApplicationService : IMicrocreditLoanApplicationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IFileStorageService _fileStorageService;
        private readonly ILogger<MicrocreditLoanApplicationService> _logger;

        public MicrocreditLoanApplicationService(
            ApplicationDbContext context,
            IFileStorageService fileStorageService,
            ILogger<MicrocreditLoanApplicationService> logger)
        {
            _context = context;
            _fileStorageService = fileStorageService;
            _logger = logger;
        }

        public async Task<MicrocreditLoanApplicationDto?> GetApplicationAsync(Guid id)
        {
            var application = await _context.MicrocreditLoanApplications
                .Include(a => a.Borrower)
                .Include(a => a.Documents)
                .Include(a => a.Guarantees)
                .Include(a => a.ApprovalSteps)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null) return null;

            return await MapToDto(application);
        }

        public async Task<MicrocreditApplicationListResponseDto> GetApplicationsAsync(
            int page = 1, 
            int pageSize = 10, 
            MicrocreditApplicationStatus? status = null,
            MicrocreditLoanType? loanType = null,
            int? branchId = null)
        {
            var query = _context.MicrocreditLoanApplications
                .Include(a => a.Borrower)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(a => a.Status == status.Value);

            if (loanType.HasValue)
                query = query.Where(a => a.LoanType == loanType.Value);

            if (branchId.HasValue)
                query = query.Where(a => a.BranchId == branchId.Value);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var applications = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Load all SavingsAccounts for borrowers at once to avoid threading issues
            var borrowerIds = applications
                .Where(a => a.Borrower != null)
                .Select(a => a.Borrower.Id.ToString())
                .Distinct()
                .ToList();
            
            var savingsAccountsList = await _context.SavingsAccounts
                .Where(sa => borrowerIds.Contains(sa.CustomerId))
                .Select(sa => new { sa.CustomerId, sa.AccountNumber })
                .ToListAsync();

            var savingsAccountsLookup = savingsAccountsList
                .GroupBy(sa => sa.CustomerId)
                .ToDictionary(g => g.Key, g => g.First().AccountNumber);

            // Map applications to DTOs synchronously now that we have all data
            var applicationDtos = new List<MicrocreditLoanApplicationDto>();
            foreach (var app in applications)
            {
                applicationDtos.Add(MapToDtoSync(app, savingsAccountsLookup));
            }

            return new MicrocreditApplicationListResponseDto
            {
                Applications = applicationDtos,
                TotalCount = totalCount,
                TotalPages = totalPages,
                CurrentPage = page,
                PageSize = pageSize
            };
        }

        public async Task<MicrocreditLoanApplicationDto> CreateApplicationAsync(CreateMicrocreditLoanApplicationDto dto, string userId)
        {
            // 🔒 CRITICAL FIX: Use transaction to prevent race conditions
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // ✅ VALIDATION 1: Validate debt-to-income ratio (max 40%)
                var debtToIncomeRatio = dto.MonthlyIncome > 0 ? dto.ExistingDebts / dto.MonthlyIncome : 0;
                if (debtToIncomeRatio > 0.40m)
                {
                    throw new InvalidOperationException(
                        $"Ratio dette/revenu trop élevé ({debtToIncomeRatio:P0}). Maximum accepté: 40%");
                }

                // Find borrower's savings account by account number
                var savingsAccount = await _context.SavingsAccounts
                    .Include(a => a.Customer)
                    .FirstOrDefaultAsync(a => a.AccountNumber == dto.SavingsAccountNumber && a.Status == SavingsAccountStatus.Active);

                if (savingsAccount == null)
                    throw new ArgumentException("Savings account not found or not active");

                // Get customer from the savings account
                var savingsCustomer = savingsAccount.Customer;
                if (savingsCustomer == null)
                    throw new ArgumentException("Customer information not found for this savings account");

                // Fetch branch information
                var branch = await _context.Branches.FindAsync(dto.BranchId);
                var branchName = branch?.Name ?? "Unknown Branch";

                // Fetch loan officer information
                var loanOfficer = await _context.Users.FindAsync(userId);
                var loanOfficerName = loanOfficer != null 
                    ? $"{loanOfficer.FirstName} {loanOfficer.LastName}" 
                    : "Unknown Officer";

                // Check if borrower already exists for this customer
                var existingBorrower = await _context.MicrocreditBorrowers
                    .FirstOrDefaultAsync(b => b.FirstName == savingsCustomer.FirstName && 
                                            b.LastName == savingsCustomer.LastName && 
                                            b.Identity.Contains(savingsCustomer.DocumentNumber));

                MicrocreditBorrower borrower;
                if (existingBorrower != null)
                {
                    borrower = existingBorrower;
                    
                    // ✅ VALIDATION 2: Check active applications limit (max 3 active)
                    var activeApplicationsCount = await _context.MicrocreditLoanApplications
                        .CountAsync(a => a.BorrowerId == borrower.Id && 
                                        (a.Status == MicrocreditApplicationStatus.Draft ||
                                         a.Status == MicrocreditApplicationStatus.Submitted ||
                                         a.Status == MicrocreditApplicationStatus.UnderReview));
                    
                    if (activeApplicationsCount >= 3)
                    {
                        throw new InvalidOperationException(
                            "Limite de demandes actives atteinte. Maximum: 3 demandes en cours (Draft/Submitted/UnderReview)");
                    }
                }
                else
                {
                    // Create new borrower from savings customer data
                    borrower = new MicrocreditBorrower
                    {
                        Id = Guid.NewGuid(),
                        FirstName = savingsCustomer.FirstName,
                        LastName = savingsCustomer.LastName,
                        DateOfBirth = DateOnly.FromDateTime(savingsCustomer.DateOfBirth),
                        Gender = savingsCustomer.Gender == SavingsGender.Male ? "M" : "F",
                        Address = JsonSerializer.Serialize(new
                        {
                            street = savingsCustomer.Street,
                            commune = savingsCustomer.Commune,
                            department = savingsCustomer.Department,
                            country = savingsCustomer.Country ?? "Haiti"
                        }),
                        Contact = JsonSerializer.Serialize(new
                        {
                            primaryPhone = savingsCustomer.PrimaryPhone,
                            secondaryPhone = savingsCustomer.SecondaryPhone,
                            email = savingsCustomer.Email
                        }),
                        Identity = JsonSerializer.Serialize(new
                        {
                            documentType = savingsCustomer.DocumentType.ToString(),
                            documentNumber = savingsCustomer.DocumentNumber,
                            issuedDate = savingsCustomer.IssuedDate,
                            expiryDate = savingsCustomer.ExpiryDate,
                            issuingAuthority = savingsCustomer.IssuingAuthority
                        }),
                        Occupation = savingsCustomer.Occupation ?? "Non spécifié",
                        MonthlyIncome = savingsCustomer.MonthlyIncome ?? dto.MonthlyIncome,
                        EmploymentType = savingsCustomer.IncomeSource ?? "Non spécifié",
                        YearsInBusiness = null,
                        CreditScore = null,
                        PreviousLoans = "[]",
                        References = JsonSerializer.Serialize(new[]
                        {
                            new
                            {
                                name = savingsCustomer.ReferencePersonName ?? "",
                                phone = savingsCustomer.ReferencePersonPhone ?? "",
                                relationship = "Référence personnelle"
                            }
                        })
                    };

                    _context.MicrocreditBorrowers.Add(borrower);
                }

                // Calculate guarantee amount (15% of requested amount)
                var guaranteeAmount = dto.RequestedAmount * 0.15m;

                var application = new MicrocreditLoanApplication
                {
                    Id = Guid.NewGuid(),
                    ApplicationNumber = await GenerateApplicationNumberAsync(),
                    BorrowerId = borrower.Id,
                    SavingsAccountNumber = dto.SavingsAccountNumber,
                    LoanType = dto.LoanType,
                    RequestedAmount = dto.RequestedAmount,
                    RequestedDurationMonths = dto.RequestedDurationMonths,
                    Purpose = dto.Purpose,
                    BusinessPlan = dto.BusinessPlan,
                    Currency = dto.Currency,
                    BranchId = dto.BranchId,
                    CustomerName = dto.CustomerName ?? savingsCustomer.FirstName + " " + savingsCustomer.LastName,
                    CustomerPhone = dto.Phone ?? savingsCustomer.PrimaryPhone,
                    CustomerEmail = dto.Email ?? savingsCustomer.Email,
                    CustomerAddressJson = dto.CustomerAddress != null ? JsonSerializer.Serialize(new { address = dto.CustomerAddress }) : savingsCustomer != null ? JsonSerializer.Serialize(new { street = savingsCustomer.Street, commune = savingsCustomer.Commune, department = savingsCustomer.Department, country = savingsCustomer.Country }) : null,
                    Occupation = dto.Occupation ?? (savingsCustomer?.Occupation ?? "Non spécifié"),
                    BranchName = branchName,
                    MonthlyIncome = dto.MonthlyIncome,
                    MonthlyExpenses = dto.MonthlyExpenses,
                    ExistingDebts = dto.ExistingDebts,
                    CollateralValue = dto.CollateralValue,
                    BlockedGuaranteeAmount = guaranteeAmount,
                    DebtToIncomeRatio = debtToIncomeRatio,
                    Dependents = dto.Dependents,
                    InterestRate = dto.InterestRate,
                    MonthlyInterestRate = dto.MonthlyInterestRate,
                    CollateralType = dto.CollateralType,
                    CollateralDescription = dto.CollateralDescription,
                    Guarantor1Name = dto.Guarantor1Name,
                    Guarantor1Phone = dto.Guarantor1Phone,
                    Guarantor1Relation = dto.Guarantor1Relation,
                    Guarantor2Name = dto.Guarantor2Name,
                    Guarantor2Phone = dto.Guarantor2Phone,
                    Guarantor2Relation = dto.Guarantor2Relation,
                    Reference1Name = dto.Reference1Name,
                    Reference1Phone = dto.Reference1Phone,
                    Reference2Name = dto.Reference2Name,
                    Reference2Phone = dto.Reference2Phone,
                    HasNationalId = dto.HasNationalId,
                    HasProofOfResidence = dto.HasProofOfResidence,
                    HasProofOfIncome = dto.HasProofOfIncome,
                    HasCollateralDocs = dto.HasCollateralDocs,
                    Notes = dto.Notes,
                    Status = MicrocreditApplicationStatus.Draft,
                    LoanOfficerId = userId,
                    LoanOfficerName = loanOfficerName
                };

                // 🔒 Block the guarantee amount from the savings account
                if (savingsAccount.AvailableBalance >= guaranteeAmount)
                {
                    // Block the guarantee amount
                    savingsAccount.BlockedBalance += guaranteeAmount;
                    savingsAccount.AvailableBalance -= guaranteeAmount;
                    savingsAccount.UpdatedAt = DateTime.UtcNow;
                    application.BlockedSavingsAccountId = savingsAccount.Id;
                    
                    // Update application status to indicate guarantee is blocked
                    application.Status = MicrocreditApplicationStatus.Submitted;
                    application.SubmittedAt = DateTime.UtcNow;
                }
                else
                {
                    // If insufficient funds, still create application but don't block
                    application.BlockedGuaranteeAmount = null;
                    application.BlockedSavingsAccountId = null;
                }

                _context.MicrocreditLoanApplications.Add(application);
                // Add guarantees if provided
                if (dto.Guarantees != null && dto.Guarantees.Any())
                {
                    foreach (var guaranteeDto in dto.Guarantees)
                    {
                        var guarantee = new MicrocreditGuarantee
                        {
                            Id = Guid.NewGuid(),
                            ApplicationId = application.Id,
                            Type = guaranteeDto.Type,
                            Description = guaranteeDto.Description,
                            Value = guaranteeDto.Value,
                            Currency = guaranteeDto.Currency,
                            GuarantorInfo = guaranteeDto.GuarantorInfo != null ? JsonSerializer.Serialize(guaranteeDto.GuarantorInfo) : null,
                            CreatedAt = DateTime.UtcNow,
                            Verified = false
                        };
                        _context.MicrocreditGuarantees.Add(guarantee);
                    }
                }
                
                // ✅ Save changes within transaction
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return await GetApplicationAsync(application.Id) 
                    ?? throw new InvalidOperationException("Failed to retrieve created application");
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException(
                    "Le compte d'épargne a été modifié par une autre opération. Veuillez réessayer.");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<MicrocreditLoanApplicationDto> UpdateApplicationAsync(Guid id, CreateMicrocreditLoanApplicationDto dto)
        {
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
                throw new ArgumentException("Application not found");

            if (application.Status != MicrocreditApplicationStatus.Draft)
                throw new InvalidOperationException("Only draft applications can be updated");

            // Update application properties
            application.LoanType = dto.LoanType;
            application.RequestedAmount = dto.RequestedAmount;
            application.RequestedDurationMonths = dto.RequestedDurationMonths;
            application.Purpose = dto.Purpose;
            application.BusinessPlan = dto.BusinessPlan;
            application.Currency = dto.Currency;
            application.BranchId = dto.BranchId;
            application.MonthlyIncome = dto.MonthlyIncome;
            application.MonthlyExpenses = dto.MonthlyExpenses;
            application.ExistingDebts = dto.ExistingDebts;
            application.CollateralValue = dto.CollateralValue;
            // Snapshot and additional fields
            application.Dependents = dto.Dependents;
            application.InterestRate = dto.InterestRate;
            application.MonthlyInterestRate = dto.MonthlyInterestRate;
            application.CollateralType = dto.CollateralType;
            application.CollateralDescription = dto.CollateralDescription;
            application.Guarantor1Name = dto.Guarantor1Name;
            application.Guarantor1Phone = dto.Guarantor1Phone;
            application.Guarantor1Relation = dto.Guarantor1Relation;
            application.Guarantor2Name = dto.Guarantor2Name;
            application.Guarantor2Phone = dto.Guarantor2Phone;
            application.Guarantor2Relation = dto.Guarantor2Relation;
            application.Reference1Name = dto.Reference1Name;
            application.Reference1Phone = dto.Reference1Phone;
            application.Reference2Name = dto.Reference2Name;
            application.Reference2Phone = dto.Reference2Phone;
            application.HasNationalId = dto.HasNationalId;
            application.HasProofOfResidence = dto.HasProofOfResidence;
            application.HasProofOfIncome = dto.HasProofOfIncome;
            application.HasCollateralDocs = dto.HasCollateralDocs;
            application.Notes = dto.Notes;
            application.CustomerName = dto.CustomerName ?? application.CustomerName;
            application.CustomerPhone = dto.Phone ?? application.CustomerPhone;
            application.CustomerEmail = dto.Email ?? application.CustomerEmail;
            application.Occupation = dto.Occupation ?? application.Occupation;
            // If address was sent, serialize to JSON and store
            if (!string.IsNullOrEmpty(dto.CustomerAddress))
            {
                application.CustomerAddressJson = JsonSerializer.Serialize(new { address = dto.CustomerAddress });
            }

            // Recalculate debt-to-income ratio (only existing debts, not the new loan)
            application.DebtToIncomeRatio = dto.MonthlyIncome > 0 
                ? dto.ExistingDebts / dto.MonthlyIncome 
                : 0;

            application.UpdatedAt = DateTime.UtcNow;

            // Update guarantees on update: remove existing guarantees and re-add incoming DTO guarantees
            if (dto.Guarantees != null)
            {
                var existingGuarantees = await _context.MicrocreditGuarantees
                    .Where(g => g.ApplicationId == application.Id)
                    .ToListAsync();
                if (existingGuarantees.Any())
                {
                    _context.MicrocreditGuarantees.RemoveRange(existingGuarantees);
                }

                foreach (var guaranteeDto in dto.Guarantees)
                {
                    var guarantee = new MicrocreditGuarantee
                    {
                        Id = Guid.NewGuid(),
                        ApplicationId = application.Id,
                        Type = guaranteeDto.Type,
                        Description = guaranteeDto.Description,
                        Value = guaranteeDto.Value,
                        Currency = guaranteeDto.Currency,
                        GuarantorInfo = guaranteeDto.GuarantorInfo != null ? JsonSerializer.Serialize(guaranteeDto.GuarantorInfo) : null,
                        CreatedAt = DateTime.UtcNow,
                        Verified = false
                    };
                    _context.MicrocreditGuarantees.Add(guarantee);
                }
            }

            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve updated application");
        }

        public async Task<MicrocreditLoanApplicationDto> SubmitApplicationAsync(Guid id)
        {
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
                throw new ArgumentException("Application not found");

            if (application.Status != MicrocreditApplicationStatus.Draft)
                throw new InvalidOperationException("Only draft applications can be submitted");

            // Validate application before submission
            var isValid = await ValidateApplicationAsync(id);
            if (!isValid)
                throw new InvalidOperationException("Application validation failed");

            application.Status = MicrocreditApplicationStatus.Submitted;
            application.SubmittedAt = DateTime.UtcNow;
            application.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve updated application");
        }

        public async Task<MicrocreditLoanApplicationDto> ReviewApplicationAsync(Guid id, string reviewerId, string comments)
        {
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == id);
            
            if (application == null)
                throw new ArgumentException("Application not found");
            
            if (application.Status != MicrocreditApplicationStatus.Submitted)
                throw new InvalidOperationException("Can only review submitted applications");
            
            application.Status = MicrocreditApplicationStatus.UnderReview;
            application.ReviewedAt = DateTime.UtcNow;
            application.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve reviewed application");
        }

        public async Task<MicrocreditLoanApplicationDto> ApproveApplicationAsync(Guid id, string approverId, string comments, decimal? approvedAmount = null, DateTime? disbursementDate = null)
        {
            var application = await _context.MicrocreditLoanApplications
                .Include(a => a.Borrower)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
                throw new ArgumentException("Application not found");

            if (application.Status != MicrocreditApplicationStatus.UnderReview &&
                application.Status != MicrocreditApplicationStatus.Submitted)
                throw new InvalidOperationException("Application is not in a reviewable state");

            application.Status = MicrocreditApplicationStatus.Approved;
            application.ApprovedAt = DateTime.UtcNow;
            application.UpdatedAt = DateTime.UtcNow;
            
            // Store disbursement date if provided by admin
            if (disbursementDate.HasValue)
            {
                application.DisbursementDate = disbursementDate.Value;
            }

            // Create the loan from the approved application
            var loanAmount = approvedAmount ?? application.RequestedAmount;
            var durationMonths = application.RequestedDurationMonths;
            
            // Use application interest rate if available, otherwise fallback to configuration
            decimal annualInterestRate;
            
            if (application.InterestRate > 0)
            {
                annualInterestRate = application.InterestRate;
            }
            else
            {
                var loanTypeConfig = await _context.MicrocreditLoanTypeConfigurations
                    .FirstOrDefaultAsync(c => c.Type == application.LoanType);
                annualInterestRate = loanTypeConfig?.DefaultInterestRate ?? 0.15m;
            }
            
            var monthlyInterestRate = annualInterestRate / 12;
            
            // Calculate monthly installment using amortization formula
            var monthlyPayment = loanAmount * 
                (monthlyInterestRate * (decimal)Math.Pow((double)(1 + monthlyInterestRate), durationMonths)) /
                ((decimal)Math.Pow((double)(1 + monthlyInterestRate), durationMonths) - 1);
            
            var totalAmountDue = monthlyPayment * durationMonths;
            
            // Set disbursement date (use provided date or default to 7 days from now)
            var plannedDisbursementDate = disbursementDate ?? DateTime.Now.AddDays(7);
            var firstInstallmentDate = plannedDisbursementDate.AddMonths(1);
            var maturityDate = firstInstallmentDate.AddMonths(durationMonths - 1);
            
            // Create the loan
            var loan = new MicrocreditLoan
            {
                Id = Guid.NewGuid(),
                LoanNumber = await GenerateLoanNumberAsync(),
                ApplicationId = application.Id,
                BorrowerId = application.BorrowerId,
                LoanType = application.LoanType,
                PrincipalAmount = loanAmount,
                InterestRate = annualInterestRate,
                DurationMonths = durationMonths,
                InstallmentAmount = monthlyPayment,
                Currency = application.Currency,
                DisbursementDate = DateOnly.FromDateTime(plannedDisbursementDate),
                FirstInstallmentDate = DateOnly.FromDateTime(firstInstallmentDate),
                MaturityDate = DateOnly.FromDateTime(maturityDate),
                TotalAmountDue = totalAmountDue,
                AmountPaid = 0,
                PrincipalPaid = 0,
                InterestPaid = 0,
                PenaltiesPaid = 0,
                OutstandingBalance = totalAmountDue,
                OutstandingPrincipal = loanAmount,
                OutstandingInterest = totalAmountDue - loanAmount,
                Status = MicrocreditLoanStatus.Approved, // Approved, waiting for disbursement
                BranchId = application.BranchId,
                LoanOfficerId = application.LoanOfficerId,
                LoanOfficerName = application.LoanOfficerName,
                DaysOverdue = 0,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.MicrocreditLoans.Add(loan);
            
            // Generate payment schedule
            await GeneratePaymentScheduleAsync(loan);
            
            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve approved application");
        }
        
        private async Task<string> GenerateLoanNumberAsync()
        {
            var year = DateTime.Now.Year;
            var lastLoan = await _context.MicrocreditLoans
                .Where(l => l.LoanNumber.StartsWith($"ML-{year}-"))
                .OrderByDescending(l => l.LoanNumber)
                .FirstOrDefaultAsync();
            
            int nextNumber = 1;
            if (lastLoan != null && lastLoan.LoanNumber.Length > 8)
            {
                var lastNumberStr = lastLoan.LoanNumber.Substring(8);
                if (int.TryParse(lastNumberStr, out int lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            
            return $"ML-{year}-{nextNumber:D4}";
        }
        
        private async Task GeneratePaymentScheduleAsync(MicrocreditLoan loan)
        {
            var scheduleItems = new List<MicrocreditPaymentSchedule>();
            var currentDate = loan.FirstInstallmentDate;
            var remainingPrincipal = Math.Round(loan.PrincipalAmount, 2);
            var monthlyRate = loan.InterestRate / 12;
            
            for (int i = 1; i <= loan.DurationMonths; i++)
            {
                // Intérêt calculé sur le solde au DÉBUT de la période
                var interestPortion = Math.Round(remainingPrincipal * monthlyRate, 2);
                
                decimal principalPortion;
                decimal totalAmount;
                
                // Dernier versement: capital restant complet + intérêt
                if (i == loan.DurationMonths)
                {
                    principalPortion = Math.Round(remainingPrincipal, 2);
                    totalAmount = Math.Round(principalPortion + interestPortion, 2);
                }
                else
                {
                    // Versements normaux: mensualité fixe
                    totalAmount = loan.InstallmentAmount;
                    principalPortion = Math.Round(loan.InstallmentAmount - interestPortion, 2);
                    
                    // S'assurer que le capital ne dépasse pas le solde restant
                    if (principalPortion > remainingPrincipal)
                    {
                        principalPortion = Math.Round(remainingPrincipal, 2);
                    }
                }
                
                var scheduleItem = new MicrocreditPaymentSchedule
                {
                    Id = Guid.NewGuid(),
                    LoanId = loan.Id,
                    InstallmentNumber = i,
                    DueDate = currentDate,
                    PrincipalAmount = principalPortion,
                    InterestAmount = interestPortion,
                    TotalAmount = totalAmount,
                    PaidAmount = 0,
                    Status = MicrocreditPaymentStatus.Pending,
                    CreatedAt = DateTime.Now
                };
                
                scheduleItems.Add(scheduleItem);
                
                // Nouveau solde après paiement du capital
                remainingPrincipal = Math.Round(Math.Max(0, remainingPrincipal - principalPortion), 2);
                currentDate = currentDate.AddMonths(1);
            }
            
            await _context.MicrocreditPaymentSchedules.AddRangeAsync(scheduleItems);
        }

        public async Task<MicrocreditLoanApplicationDto> RejectApplicationAsync(Guid id, string rejectedBy, string reason)
        {
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
                throw new ArgumentException("Application not found");

            if (application.Status != MicrocreditApplicationStatus.UnderReview &&
                application.Status != MicrocreditApplicationStatus.Submitted)
                throw new InvalidOperationException("Only applications under review or submitted can be rejected");

            // Unblock guarantee amount if it was blocked
            if (application.BlockedSavingsAccountId != null && application.BlockedGuaranteeAmount.HasValue)
            {
                var savingsAccount = await _context.SavingsAccounts
                    .FirstOrDefaultAsync(a => a.Id == application.BlockedSavingsAccountId);

                if (savingsAccount != null)
                {
                    // Unblock the guarantee amount
                    savingsAccount.BlockedBalance -= application.BlockedGuaranteeAmount.Value;
                    savingsAccount.AvailableBalance += application.BlockedGuaranteeAmount.Value;

                    // Clear the blocked amount references
                    application.BlockedGuaranteeAmount = null;
                    application.BlockedSavingsAccountId = null;
                }
            }

            application.Status = MicrocreditApplicationStatus.Rejected;
            application.RejectedAt = DateTime.UtcNow;
            application.RejectionReason = reason;
            application.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve rejected application");
        }

        public async Task<MicrocreditLoanApplicationDto> CancelApplicationAsync(Guid id, string cancelledBy, string reason)
        {
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
                throw new ArgumentException("Application not found");

            if (application.Status != MicrocreditApplicationStatus.Draft &&
                application.Status != MicrocreditApplicationStatus.Submitted &&
                application.Status != MicrocreditApplicationStatus.UnderReview)
                throw new InvalidOperationException("Only draft, submitted, or under review applications can be cancelled");

            // Unblock guarantee amount if it was blocked
            if (application.BlockedSavingsAccountId != null && application.BlockedGuaranteeAmount.HasValue)
            {
                var savingsAccount = await _context.SavingsAccounts
                    .FirstOrDefaultAsync(a => a.Id == application.BlockedSavingsAccountId);

                if (savingsAccount != null)
                {
                    // Unblock the guarantee amount
                    savingsAccount.BlockedBalance -= application.BlockedGuaranteeAmount.Value;
                    savingsAccount.AvailableBalance += application.BlockedGuaranteeAmount.Value;

                    // Clear the blocked amount references
                    application.BlockedGuaranteeAmount = null;
                    application.BlockedSavingsAccountId = null;
                }
            }

            application.Status = MicrocreditApplicationStatus.Cancelled;
            application.RejectionReason = reason; // Reuse rejection reason field for cancellation
            application.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve cancelled application");
        }

        public async Task<RiskAssessmentDto> CalculateRiskAssessmentAsync(Guid applicationId)
        {
            var application = await _context.MicrocreditLoanApplications
                .Include(a => a.Borrower)
                .Include(a => a.Documents)
                .Include(a => a.Guarantees)
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null)
                throw new ArgumentException("Application not found");

            var riskFactors = new List<RiskFactorDto>();
            int riskScore = 500; // Base score (neutral)

            // Debt-to-income ratio factor
            if (application.DebtToIncomeRatio > 0.4m)
            {
                riskScore -= 100;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "High Debt-to-Income Ratio",
                    Impact = "High Risk",
                    Weight = 0.3m,
                    Description = $"DTI ratio is {application.DebtToIncomeRatio:P2}, above recommended 40%"
                });
            }
            else if (application.DebtToIncomeRatio < 0.2m)
            {
                riskScore += 50;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "Low Debt-to-Income Ratio",
                    Impact = "Low Risk",
                    Weight = 0.2m,
                    Description = $"DTI ratio is {application.DebtToIncomeRatio:P2}, well within limits"
                });
            }

            // Income level factor
            if (application.MonthlyIncome > 50000) // High income in HTG
            {
                riskScore += 75;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "High Income Level",
                    Impact = "Low Risk",
                    Weight = 0.25m,
                    Description = $"Monthly income of {application.MonthlyIncome:C} provides good repayment capacity"
                });
            }
            else if (application.MonthlyIncome < 15000) // Low income
            {
                riskScore -= 75;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "Low Income Level",
                    Impact = "High Risk",
                    Weight = 0.25m,
                    Description = $"Monthly income of {application.MonthlyIncome:C} may limit repayment capacity"
                });
            }

            // Documentation completeness
            var documentCount = application.Documents.Count(d => d.Verified);
            if (documentCount >= 3)
            {
                riskScore += 25;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "Complete Documentation",
                    Impact = "Low Risk",
                    Weight = 0.15m,
                    Description = $"{documentCount} verified documents provided"
                });
            }
            else if (documentCount < 2)
            {
                riskScore -= 50;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "Incomplete Documentation",
                    Impact = "Medium Risk", 
                    Weight = 0.15m,
                    Description = $"Only {documentCount} verified documents provided"
                });
            }

            // Collateral/Guarantees factor
            if (application.Guarantees.Any(g => g.Verified) || application.CollateralValue > 0)
            {
                riskScore += 50;
                riskFactors.Add(new RiskFactorDto
                {
                    Factor = "Security Provided",
                    Impact = "Low Risk",
                    Weight = 0.2m,
                    Description = "Loan is secured with collateral or guarantees"
                });
            }

            // Determine risk level
            string riskLevel;
            string recommendation;
            
            if (riskScore >= 650)
            {
                riskLevel = "Low";
                recommendation = "Approve with standard terms";
            }
            else if (riskScore >= 450)
            {
                riskLevel = "Medium";
                recommendation = "Approve with enhanced monitoring or require additional security";
            }
            else
            {
                riskLevel = "High";
                recommendation = "Consider rejection or require significant additional security";
            }

            return new RiskAssessmentDto
            {
                Score = Math.Max(300, Math.Min(850, riskScore)), // Clamp between 300-850
                Level = riskLevel,
                Factors = riskFactors,
                Recommendation = recommendation,
                AssessedBy = "System",
                AssessedAt = DateTime.UtcNow
            };
        }

        public async Task<bool> ValidateApplicationAsync(Guid id)
        {
            var application = await _context.MicrocreditLoanApplications
                .Include(a => a.Borrower)
                .Include(a => a.Documents)
                .Include(a => a.Guarantees)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null) return false;

            // Basic validation checks
            if (string.IsNullOrEmpty(application.Purpose)) return false;
            if (application.RequestedAmount <= 0) return false;
            if (application.RequestedDurationMonths <= 0) return false;
            if (application.Borrower == null) return false;
            if (application.DebtToIncomeRatio > 0.4m) return false; // Max 40% debt-to-income

            // NOTE: Document requirement removed intentionally per business request.
            // Previous behaviour required at least a verified ID and a verified proof of income.
            // If you later want to re-enable this validation, restore the checks below.

            // Example of the removed checks (kept here as comment for future reference):
            // var hasIdDocument = application.Documents.Any(d => d.Type == MicrocreditDocumentType.IdCard && d.Verified);
            // var hasIncomeProof = application.Documents.Any(d => d.Type == MicrocreditDocumentType.ProofOfIncome && d.Verified);
            // return hasIdDocument && hasIncomeProof;

            // For now, consider the application valid if it passed the basic checks above.
            return true;
        }

        // Gestion des prêts
        public async Task<MicrocreditLoanDto?> GetLoanAsync(Guid id)
        {
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .Include(l => l.PaymentSchedule)
                .Include(l => l.Payments)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (loan == null) return null;

            return await MapLoanToDto(loan);
        }

        public async Task<MicrocreditLoanListResponseDto> GetLoansAsync(int page, int pageSize, 
            MicrocreditLoanStatus? status = null, MicrocreditLoanType? loanType = null, 
            int? branchId = null, bool? isOverdue = null)
        {
            var query = _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(l => l.Status == status.Value);

            if (loanType.HasValue)
                query = query.Where(l => l.LoanType == loanType.Value);

            if (branchId.HasValue)
                query = query.Where(l => l.BranchId == branchId.Value);

            if (isOverdue.HasValue && isOverdue.Value)
                query = query.Where(l => l.DaysOverdue > 0);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var loans = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Load all SavingsAccounts for borrowers at once to avoid threading issues
            var borrowerIds = loans
                .Where(l => l.Borrower != null)
                .Select(l => l.Borrower.Id.ToString())
                .Distinct()
                .ToList();
            
            var savingsAccountsList = await _context.SavingsAccounts
                .Where(sa => borrowerIds.Contains(sa.CustomerId))
                .Select(sa => new { sa.CustomerId, sa.AccountNumber })
                .ToListAsync();

            var savingsAccountsLookup = savingsAccountsList
                .GroupBy(sa => sa.CustomerId)
                .ToDictionary(g => g.Key, g => g.First().AccountNumber);

            // Map loans to DTOs synchronously now that we have all data
            var loanDtos = new List<MicrocreditLoanDto>();
            foreach (var loan in loans)
            {
                loanDtos.Add(MapLoanToDtoSync(loan, savingsAccountsLookup));
            }

            return new MicrocreditLoanListResponseDto
            {
                Loans = loanDtos,
                TotalCount = totalCount,
                TotalPages = totalPages,
                CurrentPage = page,
                PageSize = pageSize
            };
        }

        public async Task<List<MicrocreditLoanDto>> GetCustomerLoansAsync(Guid customerId)
        {
            var loans = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .Include(l => l.PaymentSchedule)
                .Include(l => l.Payments)
                .Where(l => l.BorrowerId == customerId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            return (await Task.WhenAll(loans.Select(MapLoanToDto))).ToList();
        }

        public async Task<List<MicrocreditLoanDto>> GetLoansByApplicationIdsAsync(List<Guid> applicationIds)
        {
            var loans = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .Include(l => l.PaymentSchedule)
                .Include(l => l.Payments)
                .Where(l => applicationIds.Contains(l.ApplicationId))
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();

            var loanDtos = new List<MicrocreditLoanDto>();
            foreach (var loan in loans)
            {
                try
                {
                    var dto = await MapLoanToDto(loan);
                    loanDtos.Add(dto);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error mapping loan {LoanId} (Application {ApplicationId}) to DTO", 
                        loan.Id, loan.ApplicationId);
                    // Continue processing other loans
                }
            }

            return loanDtos;
        }

        public async Task UpdateOverdueLoansAsync()
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            
            // Get all active loans
            var activeLoans = await _context.MicrocreditLoans
                .Include(l => l.PaymentSchedule)
                .Where(l => l.Status == MicrocreditLoanStatus.Active)
                .ToListAsync();

            foreach (var loan in activeLoans)
            {
                // Check for overdue installments
                var overdueSchedules = loan.PaymentSchedule
                    .Where(s => s.Status == MicrocreditPaymentStatus.Pending && s.DueDate < today)
                    .ToList();

                if (overdueSchedules.Any())
                {
                    // Mark installments as overdue
                    foreach (var schedule in overdueSchedules)
                    {
                        schedule.Status = MicrocreditPaymentStatus.Overdue;
                        schedule.DaysOverdue = today.DayNumber - schedule.DueDate.DayNumber;
                    }

                    // Calculate total days overdue (from earliest overdue payment)
                    var earliestOverdue = overdueSchedules.Min(s => s.DueDate);
                    loan.DaysOverdue = today.DayNumber - earliestOverdue.DayNumber;
                    
                    // Mark loan as overdue if days > 0
                    if (loan.DaysOverdue > 0)
                    {
                        loan.Status = MicrocreditLoanStatus.Overdue;
                        loan.UpdatedAt = DateTime.Now;
                    }
                }
                else
                {
                    // Reset days overdue if no more overdue payments
                    loan.DaysOverdue = 0;
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task<MicrocreditLoanDto> DisburseLoanAsync(Guid loanId, string disbursedBy, DateTime disbursementDate, string? notes = null)
        {
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .Include(l => l.PaymentSchedule)
                .FirstOrDefaultAsync(l => l.Id == loanId);

            if (loan == null)
                throw new InvalidOperationException($"Loan with ID {loanId} not found");

            if (loan.Status != MicrocreditLoanStatus.Approved)
                throw new InvalidOperationException("Only approved loans can be disbursed");

            // NOTE: The blocked guarantee amount (15%) should remain blocked until the loan is fully paid
            // It should NOT be unblocked at disbursement time, as it serves as collateral
            // The guarantee will be released when the loan is fully paid off
            
            // Update loan status and disbursement info
            loan.Status = MicrocreditLoanStatus.Active;
            loan.DisbursementDate = DateOnly.FromDateTime(disbursementDate);
            loan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return await MapLoanToDto(loan);
        }

        public async Task<List<MicrocreditPaymentScheduleDto>> GetPaymentScheduleAsync(Guid loanId)
        {
            var schedule = await _context.MicrocreditPaymentSchedules
                .Where(s => s.LoanId == loanId)
                .OrderBy(s => s.DueDate)
                .ToListAsync();

            return schedule.Select(s => new MicrocreditPaymentScheduleDto
            {
                Id = s.Id,
                InstallmentNumber = s.InstallmentNumber,
                DueDate = s.DueDate,
                PrincipalAmount = s.PrincipalAmount,
                InterestAmount = s.InterestAmount,
                TotalAmount = s.TotalAmount,
                PaidAmount = s.PaidAmount,
                Status = s.Status.ToString(),
                PaidDate = s.PaidDate,
                CreatedAt = s.CreatedAt
            }).ToList();
        }

        public async Task<MicrocreditCollectionNoteDto> AddCollectionNoteAsync(Guid loanId, CreateMicrocreditCollectionNoteDto dto, string createdBy)
        {
            var loan = await _context.MicrocreditLoans.FirstOrDefaultAsync(l => l.Id == loanId);
            if (loan == null) throw new ArgumentException("Loan not found");

            var note = new MicrocreditCollectionNote
            {
                Id = Guid.NewGuid(),
                LoanId = loanId,
                Note = dto.Note,
                CreatedBy = createdBy,
                CreatedAt = DateTime.UtcNow
            };

            _context.MicrocreditCollectionNotes.Add(note);
            await _context.SaveChangesAsync();

            return new MicrocreditCollectionNoteDto
            {
                Id = note.Id,
                LoanId = note.LoanId,
                Note = note.Note,
                CreatedBy = note.CreatedBy,
                CreatedByName = note.CreatedByName,
                CreatedAt = note.CreatedAt
            };
        }

        public async Task<List<MicrocreditCollectionNoteDto>> GetCollectionNotesAsync(Guid loanId)
        {
            var notes = await _context.MicrocreditCollectionNotes
                .Where(n => n.LoanId == loanId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            return notes.Select(n => new MicrocreditCollectionNoteDto
            {
                Id = n.Id,
                LoanId = n.LoanId,
                Note = n.Note,
                CreatedBy = n.CreatedBy,
                CreatedByName = n.CreatedByName,
                CreatedAt = n.CreatedAt
            }).ToList();
        }

        public async Task<MicrocreditLoanDto> MarkLoanAsDefaultAsync(Guid loanId, string markedBy, string reason)
        {
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .Include(l => l.PaymentSchedule)
                .FirstOrDefaultAsync(l => l.Id == loanId);

            if (loan == null)
                throw new InvalidOperationException($"Loan with ID {loanId} not found");

            if (loan.Status == MicrocreditLoanStatus.Defaulted)
                throw new InvalidOperationException("Loan is already marked as defaulted");

            // Update loan status
            loan.Status = MicrocreditLoanStatus.Defaulted;
            loan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return await MapLoanToDto(loan);
        }

        public async Task<MicrocreditLoanDto> RehabilitateLoanAsync(Guid loanId, string rehabilitatedBy, string? notes = null)
        {
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.Application)
                .Include(l => l.PaymentSchedule)
                .FirstOrDefaultAsync(l => l.Id == loanId);

            if (loan == null)
                throw new InvalidOperationException($"Loan with ID {loanId} not found");

            if (loan.Status != MicrocreditLoanStatus.Defaulted)
                throw new InvalidOperationException("Only defaulted loans can be rehabilitated");

            // Rehabilitate loan
            loan.Status = MicrocreditLoanStatus.Active;
            loan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return await MapLoanToDto(loan);
        }

        public async Task<LoanSummaryDto?> GetLoanSummaryAsync(Guid loanId)
        {
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.PaymentSchedule)
                .Include(l => l.Payments)
                .FirstOrDefaultAsync(l => l.Id == loanId);

            if (loan == null)
                return null;

            // Get next payment due
            var nextPayment = loan.PaymentSchedule
                .Where(ps => ps.Status == MicrocreditPaymentStatus.Pending)
                .OrderBy(ps => ps.DueDate)
                .FirstOrDefault();

            return new LoanSummaryDto
            {
                LoanId = loan.Id,
                LoanNumber = loan.LoanNumber,
                BorrowerName = loan.Borrower?.FullName ?? "Unknown",
                PrincipalAmount = loan.PrincipalAmount,
                OutstandingPrincipal = loan.OutstandingPrincipal,
                OutstandingInterest = loan.OutstandingInterest,
                PenaltyAmount = loan.OutstandingPenalties,
                TotalOutstanding = loan.OutstandingBalance,
                TotalPaid = loan.AmountPaid,
                PaymentsMade = loan.InstallmentsPaid,
                PaymentsRemaining = loan.InstallmentsRemaining,
                NextPaymentDate = nextPayment?.DueDate.ToDateTime(TimeOnly.MinValue),
                NextPaymentAmount = nextPayment?.TotalAmount ?? 0,
                DaysOverdue = loan.DaysOverdue,
                Status = loan.Status
            };
        }

        public async Task<List<MicrocreditPaymentDto>> GetLoanTransactionsAsync(Guid loanId)
        {
            // Reuse the existing GetLoanPaymentsAsync method
            return await GetLoanPaymentsAsync(loanId);
        }

        public async Task<List<OverdueLoanDto>> GetOverdueLoansAsync(int daysOverdue = 1)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);

            var overdueLoans = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Where(l => l.Status == MicrocreditLoanStatus.Active || l.Status == MicrocreditLoanStatus.Overdue)
                .Where(l => l.DaysOverdue >= daysOverdue)
                .OrderByDescending(l => l.DaysOverdue)
                .ToListAsync();

            var result = new List<OverdueLoanDto>();
            
            foreach (var loan in overdueLoans)
            {
                var lastPayment = await _context.MicrocreditPayments
                    .Where(p => p.LoanId == loan.Id && p.Status == MicrocreditPaymentStatus.Completed)
                    .OrderByDescending(p => p.PaymentDate)
                    .FirstOrDefaultAsync();

                result.Add(new OverdueLoanDto
                {
                    LoanId = loan.Id,
                    LoanNumber = loan.LoanNumber,
                    BorrowerName = loan.Borrower?.FullName ?? "Unknown",
                    BorrowerPhone = "", // Would need to parse from Borrower.Contact JSON
                    OutstandingAmount = loan.OutstandingBalance,
                    DaysOverdue = loan.DaysOverdue,
                    LastPaymentDate = lastPayment?.PaymentDate.ToDateTime(TimeOnly.MinValue) ?? loan.DisbursementDate.ToDateTime(TimeOnly.MinValue),
                    PenaltyAmount = loan.OutstandingPenalties,
                    LoanOfficer = loan.LoanOfficerName
                });
            }

            return result;
        }

        // Gestion des paiements
        public async Task<MicrocreditPaymentDto?> GetPaymentAsync(Guid id)
        {
            var payment = await _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
                return null;

            return MapPaymentToDto(payment);
        }

        public async Task<MicrocreditPaymentDto> RecordPaymentAsync(CreateMicrocreditPaymentDto dto, string recordedBy)
        {
            // 🔒 CRITICAL FIX: Use transaction to prevent duplicate receipt numbers
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var loan = await _context.MicrocreditLoans
                    .Include(l => l.Borrower)
                    .FirstOrDefaultAsync(l => l.Id == dto.LoanId);

                if (loan == null)
                    throw new InvalidOperationException($"Loan with ID {dto.LoanId} not found");

                if (loan.Status != MicrocreditLoanStatus.Active && loan.Status != MicrocreditLoanStatus.Defaulted)
                    throw new InvalidOperationException("Payments can only be recorded for active or defaulted loans");

                // Fetch user to get full name
                var user = await _context.Users.FindAsync(recordedBy);
                var recordedByName = user != null ? $"{user.FirstName} {user.LastName}" : recordedBy;

                // ✅ Generate unique receipt number using GUID to prevent duplicates
                // keep payment id under 20 chars (PAY-YYYYMMDD-XXXXXX => 19 chars)
                var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
                var receiptNumber = $"PAY-{DateTime.Now:yyyyMMdd}-{uniqueId}"; // format yields 19 chars

                // Create payment record
                var payment = new MicrocreditPayment
                {
                    Id = Guid.NewGuid(),
                    LoanId = dto.LoanId,
                    Amount = dto.Amount,
                    PrincipalAmount = 0, // Will calculate later
                    InterestAmount = 0,  // Will calculate later
                    PenaltyAmount = 0,   // Will calculate later
                    Currency = loan.Currency,
                    PaymentDate = dto.PaymentDate,
                    ValueDate = dto.PaymentDate,
                    PaymentMethod = dto.PaymentMethod,
                    Status = MicrocreditPaymentStatus.Pending,
                    Reference = dto.Reference,
                    Notes = dto.Notes,
                    ProcessedBy = recordedBy,
                    ProcessedByName = recordedByName, // Updated to use full name
                    BranchId = loan.BranchId,
                    BranchName = loan.BranchName,
                    ReceiptNumber = receiptNumber,
                    PaymentNumber = receiptNumber,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.MicrocreditPayments.Add(payment);
                
                // ✅ Save changes within transaction
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Return with loan info
                payment.Loan = loan;
                return MapPaymentToDto(payment);
            }
            catch (DbUpdateException ex)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException(
                    "Erreur lors de l'enregistrement du paiement. Veuillez réessayer.", ex);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<List<MicrocreditPaymentDto>> GetLoanPaymentsAsync(Guid loanId)
        {
            var payments = await _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .Where(p => p.LoanId == loanId)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();

            return payments.Select(MapPaymentToDto).ToList();
        }

        public async Task<MicrocreditPaymentDto> ConfirmPaymentAsync(Guid paymentId, string confirmedBy, string? notes = null)
        {
            var payment = await _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Application)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
                throw new InvalidOperationException($"Payment with ID {paymentId} not found");

            if (payment.Status != MicrocreditPaymentStatus.Pending)
                throw new InvalidOperationException("Only pending payments can be confirmed");

            var loan = payment.Loan;
            if (loan == null)
                throw new InvalidOperationException("Loan not found for this payment");

            // Get payment schedule to allocate payment properly
            var schedule = await _context.MicrocreditPaymentSchedules
                .Where(s => s.LoanId == loan.Id)
                .OrderBy(s => s.DueDate)
                .ToListAsync();

            // Allocate payment to principal and interest
            var remainingAmount = payment.Amount;
            var totalPrincipal = 0m;
            var totalInterest = 0m;
            var totalPenalty = 0m;

            // First, apply to any overdue payments (penalties)
            var overdueSchedules = schedule
                .Where(s => s.Status == MicrocreditPaymentStatus.Overdue || 
                           (s.Status == MicrocreditPaymentStatus.Pending && s.DueDate < DateOnly.FromDateTime(DateTime.Now)))
                .ToList();

            foreach (var overdue in overdueSchedules)
            {
                var daysLate = (DateOnly.FromDateTime(DateTime.Now).DayNumber - overdue.DueDate.DayNumber);
                if (daysLate > 0)
                {
                    // Calculate penalty (e.g., 1% per month late = 0.033% per day)
                    var penaltyRate = 0.01m / 30m; // 1% monthly penalty
                    var overduePaid = overdue.PaidAmount ?? 0m;
                    var penalty = (overdue.TotalAmount - overduePaid) * penaltyRate * daysLate;
                    
                    if (remainingAmount >= penalty)
                    {
                        totalPenalty += penalty;
                        remainingAmount -= penalty;
                    }
                    else
                    {
                        totalPenalty += remainingAmount;
                        remainingAmount = 0;
                        break;
                    }
                }
            }

            // Then apply to pending installments in order
            foreach (var scheduleItem in schedule.Where(s => s.Status == MicrocreditPaymentStatus.Pending || 
                                                              s.Status == MicrocreditPaymentStatus.Overdue))
            {
                if (remainingAmount <= 0) break;

                var paidSoFar = scheduleItem.PaidAmount ?? 0m;
                var unpaidAmount = scheduleItem.TotalAmount - paidSoFar;
                var unpaidInterest = scheduleItem.InterestAmount * (unpaidAmount / scheduleItem.TotalAmount);
                var unpaidPrincipal = scheduleItem.PrincipalAmount * (unpaidAmount / scheduleItem.TotalAmount);

                if (remainingAmount >= unpaidAmount)
                {
                    // Full payment of this installment
                    scheduleItem.PaidAmount = scheduleItem.TotalAmount;
                    scheduleItem.Status = MicrocreditPaymentStatus.Completed;
                    scheduleItem.PaidDate = DateOnly.FromDateTime(DateTime.Now);
                    
                    totalInterest += unpaidInterest;
                    totalPrincipal += unpaidPrincipal;
                    remainingAmount -= unpaidAmount;
                }
                else
                {
                    // Partial payment - apply to interest first, then principal
                    var interestPayment = remainingAmount < unpaidInterest ? remainingAmount : unpaidInterest;
                    totalInterest += interestPayment;
                    remainingAmount -= interestPayment;

                    if (remainingAmount > 0)
                    {
                        totalPrincipal += remainingAmount;
                        scheduleItem.PaidAmount = (paidSoFar + interestPayment + remainingAmount);
                        remainingAmount = 0;
                    }
                    else
                    {
                        scheduleItem.PaidAmount = (paidSoFar + interestPayment);
                    }

                    scheduleItem.Status = MicrocreditPaymentStatus.Partial;
                    break;
                }
            }

            // Update payment with calculated amounts
            payment.PrincipalAmount = totalPrincipal;
            payment.InterestAmount = totalInterest;
            payment.PenaltyAmount = totalPenalty;
            payment.Status = MicrocreditPaymentStatus.Completed;
            payment.UpdatedAt = DateTime.Now;
            
            if (!string.IsNullOrEmpty(notes))
                payment.Notes = $"{payment.Notes}\nConfirmed: {notes}";

            // Update loan balances
            loan.AmountPaid += payment.Amount;
            loan.PrincipalPaid += totalPrincipal;
            loan.InterestPaid += totalInterest;
            loan.PenaltiesPaid += totalPenalty;
            loan.OutstandingPrincipal -= totalPrincipal;
            loan.OutstandingInterest -= totalInterest;
            loan.OutstandingBalance = loan.OutstandingPrincipal + loan.OutstandingInterest;
            
            // Check if loan is fully paid
            if (loan.OutstandingBalance <= 0)
            {
                loan.Status = MicrocreditLoanStatus.Completed;
                loan.OutstandingBalance = 0;
                loan.OutstandingPrincipal = 0;
                loan.OutstandingInterest = 0;
                
                // Release blocked guarantee amount (15%) from borrower's savings account
                if (loan.Application != null && 
                    loan.Application.BlockedSavingsAccountId != null && 
                    loan.Application.BlockedGuaranteeAmount.HasValue)
                {
                    var savingsAccount = await _context.SavingsAccounts
                        .FirstOrDefaultAsync(a => a.Id == loan.Application.BlockedSavingsAccountId);

                    if (savingsAccount != null)
                    {
                        // Unblock the guarantee amount now that loan is fully paid
                        savingsAccount.BlockedBalance -= loan.Application.BlockedGuaranteeAmount.Value;
                        savingsAccount.AvailableBalance += loan.Application.BlockedGuaranteeAmount.Value;

                        // Clear the blocked amount references
                        loan.Application.BlockedGuaranteeAmount = null;
                        loan.Application.BlockedSavingsAccountId = null;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return MapPaymentToDto(payment);
        }

        public async Task<MicrocreditPaymentDto> CancelPaymentAsync(Guid paymentId, string cancelledBy, string reason)
        {
            var payment = await _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
                throw new InvalidOperationException($"Payment with ID {paymentId} not found");

            if (payment.Status != MicrocreditPaymentStatus.Pending)
                throw new InvalidOperationException("Only pending payments can be cancelled");

            // Cancel the payment
            payment.Status = MicrocreditPaymentStatus.Cancelled;
            payment.UpdatedAt = DateTime.Now;
            payment.Notes = $"{payment.Notes}\nCancelled by {cancelledBy}: {reason}";

            await _context.SaveChangesAsync();

            return MapPaymentToDto(payment);
        }

        public async Task<List<MicrocreditPaymentDto>> GetPendingPaymentsAsync(int? branchId = null)
        {
            var query = _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .Where(p => p.Status == MicrocreditPaymentStatus.Pending);

            if (branchId.HasValue)
                query = query.Where(p => p.BranchId == branchId.Value);

            var payments = await query
                .OrderBy(p => p.CreatedAt)
                .ToListAsync();

            return payments.Select(MapPaymentToDto).ToList();
        }

        public async Task<PaymentHistoryResponseDto> GetPaymentHistoryAsync(int page, int pageSize, 
            DateTime? fromDate = null, DateTime? toDate = null, 
            MicrocreditPaymentStatus? status = null, int? branchId = null)
        {
            var query = _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .AsQueryable();

            // Apply filters
            if (fromDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(fromDate.Value);
                query = query.Where(p => p.PaymentDate >= fromDateOnly);
            }

            if (toDate.HasValue)
            {
                var toDateOnly = DateOnly.FromDateTime(toDate.Value);
                query = query.Where(p => p.PaymentDate <= toDateOnly);
            }

            if (status.HasValue)
                query = query.Where(p => p.Status == status.Value);

            if (branchId.HasValue)
                query = query.Where(p => p.BranchId == branchId.Value);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var payments = await query
                .OrderByDescending(p => p.PaymentDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PaymentHistoryResponseDto
            {
                Payments = payments.Select(MapPaymentToDto).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };
        }

        public async Task<PaymentStatisticsDto> GetPaymentStatisticsAsync(DateTime? fromDate = null, 
            DateTime? toDate = null, int? branchId = null)
        {
            var query = _context.MicrocreditPayments
                .Where(p => p.Status == MicrocreditPaymentStatus.Completed);

            // Apply date filters
            if (fromDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(fromDate.Value);
                query = query.Where(p => p.PaymentDate >= fromDateOnly);
            }

            if (toDate.HasValue)
            {
                var toDateOnly = DateOnly.FromDateTime(toDate.Value);
                query = query.Where(p => p.PaymentDate <= toDateOnly);
            }

            if (branchId.HasValue)
                query = query.Where(p => p.BranchId == branchId.Value);

            var payments = await query.ToListAsync();

            // Calculate statistics
            var totalPayments = payments.Sum(p => p.Amount);
            var totalPrincipal = payments.Sum(p => p.PrincipalAmount);
            var totalInterest = payments.Sum(p => p.InterestAmount);
            var totalPenalties = payments.Sum(p => p.PenaltyAmount);
            var paymentCount = payments.Count;

            // Get payment schedule info for collection rate calculation
            var scheduleQuery = _context.MicrocreditPaymentSchedules.AsQueryable();
            
            if (fromDate.HasValue && toDate.HasValue)
            {
                var fromDateOnly = DateOnly.FromDateTime(fromDate.Value);
                var toDateOnly = DateOnly.FromDateTime(toDate.Value);
                scheduleQuery = scheduleQuery.Where(s => s.DueDate >= fromDateOnly && s.DueDate <= toDateOnly);
            }

            var expectedPayments = await scheduleQuery.SumAsync(s => s.TotalAmount);
            var collectionRate = expectedPayments > 0 ? (totalPayments / expectedPayments) * 100 : 0;

            return new PaymentStatisticsDto
            {
                TotalPaymentsCollected = totalPayments,
                TotalPrincipalCollected = totalPrincipal,
                TotalInterestCollected = totalInterest,
                TotalPenaltiesCollected = totalPenalties,
                NumberOfPayments = paymentCount,
                AveragePaymentAmount = paymentCount > 0 ? totalPayments / paymentCount : 0,
                PaymentsOnTime = 0, // Would need more complex logic to determine
                PaymentsLate = 0,   // Would need more complex logic to determine
                CollectionRate = collectionRate,
                FromDate = fromDate ?? DateTime.MinValue,
                ToDate = toDate ?? DateTime.MaxValue
            };
        }

        public async Task<PaymentReceiptDto?> GeneratePaymentReceiptAsync(Guid paymentId)
        {
            var payment = await _context.MicrocreditPayments
                .Include(p => p.Loan)
                    .ThenInclude(l => l.Borrower)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null || payment.Status != MicrocreditPaymentStatus.Completed)
                return null;

            return new PaymentReceiptDto
            {
                ReceiptNumber = payment.ReceiptNumber,
                PaymentDate = payment.PaymentDate.ToDateTime(TimeOnly.MinValue),
                BorrowerName = payment.Loan?.Borrower?.FullName ?? "Unknown",
                LoanNumber = payment.Loan?.LoanNumber ?? "Unknown",
                PaymentAmount = payment.Amount,
                Allocation = new PaymentAllocationDto
                {
                    PrincipalAmount = payment.PrincipalAmount,
                    InterestAmount = payment.InterestAmount,
                    PenaltyAmount = payment.PenaltyAmount,
                    FeesAmount = 0, // Not implemented yet
                    RemainingAmount = 0,
                    AllocationDate = payment.PaymentDate.ToDateTime(TimeOnly.MinValue)
                },
                PaymentMethod = payment.PaymentMethod,
                TransactionReference = payment.Reference,
                ReceivedBy = payment.ProcessedBy,
                BranchName = payment.BranchName,
                GeneratedAt = DateTime.Now
            };
        }

        public async Task<MicrocreditPaymentDto> ProcessEarlyPayoffAsync(EarlyPayoffDto dto, string processedBy)
        {
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .Include(l => l.PaymentSchedule)
                .FirstOrDefaultAsync(l => l.Id == dto.LoanId);

            if (loan == null)
                throw new InvalidOperationException($"Loan with ID {dto.LoanId} not found");

            if (loan.Status != MicrocreditLoanStatus.Active)
                throw new InvalidOperationException("Only active loans can be paid off early");

            // Fetch user to get full name
            var user = await _context.Users.FindAsync(processedBy);
            var processedByName = user != null ? $"{user.FirstName} {user.LastName}" : processedBy;

            // Calculate total outstanding balance
            var payoffAmount = loan.OutstandingBalance;

            // Create payoff payment
            var payment = new MicrocreditPayment
            {
                Id = Guid.NewGuid(),
                LoanId = dto.LoanId,
                Amount = payoffAmount,
                PrincipalAmount = loan.OutstandingPrincipal,
                InterestAmount = loan.OutstandingInterest,
                PenaltyAmount = loan.OutstandingPenalties,
                Currency = loan.Currency,
                PaymentDate = DateOnly.FromDateTime(dto.PaymentDate),
                PaymentMethod = dto.PaymentMethod,
                Status = MicrocreditPaymentStatus.Completed,
                Reference = dto.TransactionReference,
                Notes = $"Early payoff payment. {dto.Notes}",
                ProcessedBy = processedBy,
                ProcessedByName = processedByName, // Updated to use full name
                BranchId = loan.BranchId,
                BranchName = loan.BranchName,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            // Generate receipt number
            var lastPayment = await _context.MicrocreditPayments
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
            
            var receiptCount = 1;
            if (lastPayment != null && !string.IsNullOrEmpty(lastPayment.ReceiptNumber))
            {
                var parts = lastPayment.ReceiptNumber.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out var lastNumber))
                {
                    receiptCount = lastNumber + 1;
                }
            }
            payment.ReceiptNumber = $"PAY-{DateTime.Now:yyyyMMdd}-{receiptCount:D4}";
            payment.PaymentNumber = payment.ReceiptNumber;

            // Update loan status
            loan.Status = MicrocreditLoanStatus.Completed;
            loan.AmountPaid = loan.TotalAmountDue;
            loan.PrincipalPaid = loan.PrincipalAmount;
            loan.OutstandingBalance = 0;
            loan.OutstandingPrincipal = 0;
            loan.OutstandingInterest = 0;
            loan.OutstandingPenalties = 0;
            loan.UpdatedAt = DateTime.Now;

            // Mark all pending payment schedule entries as completed
            var pendingSchedules = loan.PaymentSchedule
                .Where(s => s.Status == MicrocreditPaymentStatus.Pending);
            
            foreach (var schedule in pendingSchedules)
            {
                schedule.Status = MicrocreditPaymentStatus.Completed;
                schedule.PaidDate = DateOnly.FromDateTime(dto.PaymentDate);
                schedule.PaidAmount = schedule.TotalAmount;
            }

            _context.MicrocreditPayments.Add(payment);
            await _context.SaveChangesAsync();

            payment.Loan = loan;
            return MapPaymentToDto(payment);
        }

        public async Task<MicrocreditDashboardStatsDto> GetDashboardStatsAsync(int? branchId = null)
        {
            var query = _context.MicrocreditLoans.AsQueryable();
            if (branchId.HasValue)
                query = query.Where(l => l.BranchId == branchId.Value);

            var activeLoans = await query.Where(l => l.Status == MicrocreditLoanStatus.Active).CountAsync();
            
            // Calculate outstanding by currency
            var outstandingHTG = await query
                .Where(l => l.Status == MicrocreditLoanStatus.Active && l.Currency == MicrocreditCurrency.HTG)
                .SumAsync(l => l.OutstandingBalance);
            var outstandingUSD = await query
                .Where(l => l.Status == MicrocreditLoanStatus.Active && l.Currency == MicrocreditCurrency.USD)
                .SumAsync(l => l.OutstandingBalance);

            var overdueCount = await query.Where(l => l.Status == MicrocreditLoanStatus.Active && l.DaysOverdue > 0).CountAsync();
            var overdueHTG = await query
                .Where(l => l.Status == MicrocreditLoanStatus.Active && l.DaysOverdue > 0 && l.Currency == MicrocreditCurrency.HTG)
                .SumAsync(l => l.OutstandingBalance);
            var overdueUSD = await query
                .Where(l => l.Status == MicrocreditLoanStatus.Active && l.DaysOverdue > 0 && l.Currency == MicrocreditCurrency.USD)
                .SumAsync(l => l.OutstandingBalance);

            var activeClients = await query
                .Where(l => l.Status == MicrocreditLoanStatus.Active)
                .Select(l => l.BorrowerId)
                .Distinct()
                .CountAsync();

            var startOfMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
            var newLoans = await query.CountAsync(l => l.CreatedAt >= startOfMonth);
            var completedLoans = await query.CountAsync(l => l.Status == MicrocreditLoanStatus.Completed && l.UpdatedAt >= startOfMonth);

            // Interest revenue (simplified - total interest paid)
            var interestHTG = await query.Where(l => l.Currency == MicrocreditCurrency.HTG).SumAsync(l => l.InterestPaid);
            var interestUSD = await query.Where(l => l.Currency == MicrocreditCurrency.USD).SumAsync(l => l.InterestPaid);

            // Repayment rate (simplified)
            var totalDue = await query.SumAsync(l => l.TotalAmountDue);
            var totalPaid = await query.SumAsync(l => l.AmountPaid);
            var repaymentRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

            // Total disbursed/decaisse by currency (sum of principal amounts)
            var totalDisbursedHTG = await query
                .Where(l => l.Currency == MicrocreditCurrency.HTG)
                .SumAsync(l => l.PrincipalAmount);
            var totalDisbursedUSD = await query
                .Where(l => l.Currency == MicrocreditCurrency.USD)
                .SumAsync(l => l.PrincipalAmount);

            var branchGroups = await query
                .GroupBy(l => new { l.BranchId, l.BranchName })
                .Select(g => new
                {
                    BranchId = g.Key.BranchId,
                    BranchName = g.Key.BranchName,
                    TotalLoans = g.Count(l => l.Status == MicrocreditLoanStatus.Active || l.Status == MicrocreditLoanStatus.Overdue),
                    TotalDisbursedHTG = g.Where(l => l.Currency == MicrocreditCurrency.HTG).Sum(l => l.PrincipalAmount),
                    TotalDisbursedUSD = g.Where(l => l.Currency == MicrocreditCurrency.USD).Sum(l => l.PrincipalAmount),
                    OutstandingHTG = g.Where(l => (l.Status == MicrocreditLoanStatus.Active || l.Status == MicrocreditLoanStatus.Overdue) && l.Currency == MicrocreditCurrency.HTG).Sum(l => l.OutstandingBalance),
                    OutstandingUSD = g.Where(l => (l.Status == MicrocreditLoanStatus.Active || l.Status == MicrocreditLoanStatus.Overdue) && l.Currency == MicrocreditCurrency.USD).Sum(l => l.OutstandingBalance),
                    TotalPaid = g.Sum(l => l.AmountPaid),
                    TotalDue = g.Sum(l => l.TotalAmountDue),
                    OutstandingPortfolio = g.Where(l => l.Status == MicrocreditLoanStatus.Active || l.Status == MicrocreditLoanStatus.Overdue).Sum(l => l.OutstandingBalance),
                    OutstandingPar30 = g.Where(l => l.DaysOverdue >= 30 && (l.Status == MicrocreditLoanStatus.Active || l.Status == MicrocreditLoanStatus.Overdue)).Sum(l => l.OutstandingBalance)
                })
                .ToListAsync();

            var branchPerformance = branchGroups
                .Select(g =>
                {
                    decimal repaymentRate = 0;
                    if (g.TotalDue > 0)
                    {
                        repaymentRate = Math.Round((g.TotalPaid / g.TotalDue) * 100, 2);
                    }

                    decimal par30Rate = 0;
                    if (g.OutstandingPortfolio > 0)
                    {
                        par30Rate = Math.Round((g.OutstandingPar30 / g.OutstandingPortfolio) * 100, 2);
                    }

                    return new BranchPerformanceSummaryDto
                    {
                        BranchId = g.BranchId,
                        BranchName = string.IsNullOrWhiteSpace(g.BranchName) ? $"Succursale #{g.BranchId}" : g.BranchName,
                        TotalLoans = g.TotalLoans,
                        TotalDisbursed = new CurrencyAmountDto { HTG = g.TotalDisbursedHTG, USD = g.TotalDisbursedUSD },
                        TotalOutstanding = new CurrencyAmountDto { HTG = g.OutstandingHTG, USD = g.OutstandingUSD },
                        RepaymentRate = repaymentRate,
                        Par30 = par30Rate
                    };
                })
                .OrderByDescending(b => b.TotalLoans)
                .ToList();

            return new MicrocreditDashboardStatsDto
            {
                TotalClients = activeClients,
                ActiveLoans = activeLoans,
                TotalOutstanding = new CurrencyAmountDto { HTG = outstandingHTG, USD = outstandingUSD },
                TotalDisbursed = new CurrencyAmountDto { HTG = totalDisbursedHTG, USD = totalDisbursedUSD },
                RepaymentRate = repaymentRate,
                OverdueLoans = new OverdueStatsDto 
                { 
                    Count = overdueCount, 
                    Amount = new CurrencyAmountDto { HTG = overdueHTG, USD = overdueUSD } 
                },
                InterestRevenue = new CurrencyAmountDto { HTG = interestHTG, USD = interestUSD },
                LoansCompletedThisMonth = completedLoans,
                NewLoansThisMonth = newLoans,
                BranchPerformance = branchPerformance,
                GeneratedAt = DateTime.Now
            };
        }

        public async Task<List<AgentPerformanceDto>> GetAgentPerformanceAsync(int? branchId = null, int months = 6)
        {
            var query = _context.MicrocreditLoans.AsQueryable();
            if (branchId.HasValue)
                query = query.Where(l => l.BranchId == branchId.Value);

            var startOfMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);

            var agents = await query
                .Where(l => !string.IsNullOrEmpty(l.LoanOfficerId))
                .GroupBy(l => new { l.LoanOfficerId, l.LoanOfficerName })
                .Select(g => new 
                {
                    Id = g.Key.LoanOfficerId,
                    Name = g.Key.LoanOfficerName,
                    TotalLoans = g.Count(),
                    ActiveLoans = g.Count(l => l.Status == MicrocreditLoanStatus.Active),
                    TotalDisbursedHTG = g.Where(l => l.Currency == MicrocreditCurrency.HTG).Sum(l => l.PrincipalAmount),
                    TotalDisbursedUSD = g.Where(l => l.Currency == MicrocreditCurrency.USD).Sum(l => l.PrincipalAmount),
                    OutstandingBalance = g.Sum(l => l.OutstandingBalance),
                    OverdueLoans = g.Count(l => l.Status == MicrocreditLoanStatus.Active && l.DaysOverdue > 0),
                    TotalPaidHTG = g.Where(l => l.Currency == MicrocreditCurrency.HTG).Sum(l => l.AmountPaid),
                    TotalPaidUSD = g.Where(l => l.Currency == MicrocreditCurrency.USD).Sum(l => l.AmountPaid),
                    TotalDue = g.Sum(l => l.TotalAmountDue),
                    NewLoans = g.Count(l => l.CreatedAt >= startOfMonth)
                })
                .ToListAsync();

            var result = new List<AgentPerformanceDto>();
            foreach (var agent in agents)
            {
                var totalPaid = agent.TotalPaidHTG + agent.TotalPaidUSD;
                var collectionRate = agent.TotalDue > 0 ? (totalPaid / agent.TotalDue) * 100 : 0;
                var totalDisbursed = agent.TotalDisbursedHTG + agent.TotalDisbursedUSD;
                var avgLoanSize = agent.TotalLoans > 0 ? totalDisbursed / agent.TotalLoans : 0;
                
                // Simple rating logic
                string rating = "B";
                if (collectionRate > 95) rating = "A";
                else if (collectionRate < 80) rating = "C";

                result.Add(new AgentPerformanceDto
                {
                    AgentId = agent.Id,
                    AgentName = agent.Name,
                    TotalLoansManaged = agent.TotalLoans,
                    ActiveLoans = agent.ActiveLoans,
                    TotalDisbursed = new CurrencyAmountDto { HTG = agent.TotalDisbursedHTG, USD = agent.TotalDisbursedUSD },
                    TotalCollected = new CurrencyAmountDto { HTG = agent.TotalPaidHTG, USD = agent.TotalPaidUSD },
                    OutstandingBalance = agent.OutstandingBalance,
                    OverdueLoans = agent.OverdueLoans,
                    CollectionRate = collectionRate,
                    AverageLoanSize = avgLoanSize,
                    NewLoansThisMonth = agent.NewLoans,
                    PortfolioGrowth = 0, // Simplified
                    PerformanceRating = rating
                });
            }

            return result.OrderByDescending(a => a.TotalLoansManaged).ToList();
        }

        public async Task<List<PortfolioTrendDto>> GetPortfolioTrendAsync(int? branchId = null, int months = 12)
        {
            var result = new List<PortfolioTrendDto>();
            var currentDate = DateTime.Now;

            for (int i = months - 1; i >= 0; i--)
            {
                var targetDate = currentDate.AddMonths(-i);
                var periodStart = new DateTime(targetDate.Year, targetDate.Month, 1);
                var periodEnd = periodStart.AddMonths(1).AddDays(-1);

                var query = _context.MicrocreditLoans.AsQueryable();
                if (branchId.HasValue)
                    query = query.Where(l => l.BranchId == branchId.Value);

                // Disbursements for the month
                var disbursements = await query
                    .Where(l => l.DisbursementDate >= DateOnly.FromDateTime(periodStart) && 
                               l.DisbursementDate <= DateOnly.FromDateTime(periodEnd))
                    .SumAsync(l => l.PrincipalAmount);

                // Collections for the month
                var collections = await _context.MicrocreditPayments
                    .Where(p => p.PaymentDate >= DateOnly.FromDateTime(periodStart) && 
                               p.PaymentDate <= DateOnly.FromDateTime(periodEnd) &&
                               p.Status == MicrocreditPaymentStatus.Completed &&
                               (branchId == null || p.BranchId == branchId.Value))
                    .SumAsync(p => p.Amount);

                // Outstanding balance at end of month
                var outstandingBalance = await query
                    .Where(l => l.CreatedAt <= periodEnd)
                    .SumAsync(l => l.OutstandingBalance);

                // New loans for the month
                var newLoans = await query
                    .CountAsync(l => l.CreatedAt >= periodStart && l.CreatedAt <= periodEnd);

                // Completed loans for the month
                var completedLoans = await query
                    .CountAsync(l => l.Status == MicrocreditLoanStatus.Completed && 
                                   l.UpdatedAt >= periodStart && l.UpdatedAt <= periodEnd);

                // Active clients at end of month
                var activeClients = await query
                    .Where(l => l.Status == MicrocreditLoanStatus.Active && l.CreatedAt <= periodEnd)
                    .Select(l => l.BorrowerId)
                    .Distinct()
                    .CountAsync();

                // Collection rate for the month
                var collectionRate = disbursements > 0 ? (collections / disbursements) * 100 : 0;

                // Portfolio growth (simplified - change in outstanding balance)
                decimal portfolioGrowth = 0;
                if (i < months - 1)
                {
                    var previousOutstanding = result.Last().OutstandingBalance;
                    portfolioGrowth = previousOutstanding > 0 ? 
                        ((outstandingBalance - previousOutstanding) / previousOutstanding) * 100 : 0;
                }

                result.Add(new PortfolioTrendDto
                {
                    Period = $"{periodStart:MMM yyyy}",
                    Disbursements = disbursements,
                    Collections = collections,
                    OutstandingBalance = outstandingBalance,
                    NewLoans = newLoans,
                    CompletedLoans = completedLoans,
                    PortfolioGrowth = portfolioGrowth,
                    CollectionRate = collectionRate,
                    ActiveClients = activeClients
                });
            }

            return result;
        }

        // Méthodes privées utiles
        private async Task<MicrocreditLoanApplicationDto> MapToDto(MicrocreditLoanApplication application)
        {
            var savingsAccountsLookup = new Dictionary<string, string>();
            
            if (application.Borrower != null)
            {
                var savingsAccount = await _context.SavingsAccounts
                    .FirstOrDefaultAsync(sa => sa.CustomerId == application.Borrower.Id.ToString());
                
                if (savingsAccount != null)
                {
                    savingsAccountsLookup[application.Borrower.Id.ToString()] = savingsAccount.AccountNumber;
                }
            }

            var dto = MapToDtoSync(application, savingsAccountsLookup);

            // Load LoanId if exists
            var loan = await _context.MicrocreditLoans
                .FirstOrDefaultAsync(l => l.ApplicationId == application.Id);
            
            if (loan != null)
            {
                dto.LoanId = loan.Id;
            }

            return dto;
        }

        private async Task<MicrocreditLoanDto> MapLoanToDto(MicrocreditLoan loan)
        {
            var savingsAccountsLookup = new Dictionary<string, string>();
            
            if (loan.Borrower != null)
            {
                var savingsAccount = await _context.SavingsAccounts
                    .FirstOrDefaultAsync(sa => sa.CustomerId == loan.Borrower.Id.ToString());
                
                if (savingsAccount != null)
                {
                    savingsAccountsLookup[loan.Borrower.Id.ToString()] = savingsAccount.AccountNumber;
                }
            }

            return MapLoanToDtoSync(loan, savingsAccountsLookup);
        }

        private MicrocreditLoanApplicationDto MapToDtoSync(MicrocreditLoanApplication application, Dictionary<string, string> savingsAccountsLookup)
        {
            // Note: LoanId is not included in sync mapping to avoid DB calls
            // Use MapToDto for complete data including LoanId
            var dto = new MicrocreditLoanApplicationDto
            {
                Id = application.Id,
                ApplicationNumber = application.ApplicationNumber,
                SavingsAccountNumber = application.SavingsAccountNumber,
                BorrowerId = application.BorrowerId,
                LoanId = null, // Not loaded in sync method
                LoanType = application.LoanType.ToString(),
                RequestedAmount = application.RequestedAmount,
                RequestedDurationMonths = application.RequestedDurationMonths,
                Purpose = application.Purpose,
                BusinessPlan = application.BusinessPlan,
                Currency = application.Currency.ToString(),
                BranchId = application.BranchId,
                BranchName = application.BranchName,
                MonthlyIncome = application.MonthlyIncome,
                MonthlyExpenses = application.MonthlyExpenses,
                ExistingDebts = application.ExistingDebts,
                CollateralValue = application.CollateralValue,
                DebtToIncomeRatio = application.DebtToIncomeRatio,
                Status = application.Status.ToString(),
                SubmittedAt = application.SubmittedAt,
                ReviewedAt = application.ReviewedAt,
                ApprovedAt = application.ApprovedAt,
                RejectedAt = application.RejectedAt,
                RejectionReason = application.RejectionReason,
                CreatedAt = application.CreatedAt,
                               UpdatedAt = application.UpdatedAt,
                LoanOfficerId = application.LoanOfficerId,
                LoanOfficerName = application.LoanOfficerName,
                CurrentApprovalLevel = application.CurrentApprovalLevel.ToString(),
                // Add snapshot fields from application
                CustomerName = application.CustomerName,
                CustomerPhone = application.CustomerPhone,
                CustomerEmail = application.CustomerEmail,
                CustomerAddress = application.CustomerAddressJson != null 
                    ? ExtractAddressString(application.CustomerAddressJson) 
                    : null,
                Occupation = application.Occupation,
                Dependents = application.Dependents,
                InterestRate = application.InterestRate,
                MonthlyInterestRate = application.MonthlyInterestRate,
                CollateralType = application.CollateralType,
                CollateralDescription = application.CollateralDescription,
                Guarantor1Name = application.Guarantor1Name,
                Guarantor1Phone = application.Guarantor1Phone,
                Guarantor1Relation = application.Guarantor1Relation,
                Guarantor2Name = application.Guarantor2Name,
                Guarantor2Phone = application.Guarantor2Phone,
                Guarantor2Relation = application.Guarantor2Relation,
                Reference1Name = application.Reference1Name,
                Reference1Phone = application.Reference1Phone,
                Reference2Name = application.Reference2Name,
                Reference2Phone = application.Reference2Phone,
                HasNationalId = application.HasNationalId,
                HasProofOfResidence = application.HasProofOfResidence,
                HasProofOfIncome = application.HasProofOfIncome,
                HasCollateralDocs = application.HasCollateralDocs,
                Notes = application.Notes
            };

            // Map borrower if available
            if (application.Borrower != null)
            {
                // Get AccountNumber from application or lookup dictionary
                string accountNumber = application.SavingsAccountNumber;
                if (string.IsNullOrEmpty(accountNumber))
                {
                    savingsAccountsLookup.TryGetValue(application.Borrower.Id.ToString(), out var foundAccount);
                    accountNumber = foundAccount ?? string.Empty;
                }
                
                dto.Borrower = new MicrocreditBorrowerDto
                {
                    Id = application.Borrower.Id,
                    AccountNumber = accountNumber,
                    FirstName = application.Borrower.FirstName,
                    LastName = application.Borrower.LastName,
                    DateOfBirth = application.Borrower.DateOfBirth,
                    Gender = application.Borrower.Gender,
                    Occupation = application.Borrower.Occupation,
                    MonthlyIncome = application.Borrower.MonthlyIncome,
                    EmploymentType = application.Borrower.EmploymentType,
                    YearsInBusiness = application.Borrower.YearsInBusiness,
                    CreditScore = application.Borrower.CreditScore,
                    CreatedAt = application.Borrower.CreatedAt,
                    UpdatedAt = application.UpdatedAt
                };

                // Parse JSON fields if available
                var borrowerAddressJson = application.Borrower?.Address;
                if (!string.IsNullOrEmpty(borrowerAddressJson))
                {
                    dto.Borrower!.Address = JsonSerializer.Deserialize<BorrowerAddressDto>(borrowerAddressJson!) ?? new();
                }

                var borrowerContactJson = application.Borrower?.Contact;
                if (!string.IsNullOrEmpty(borrowerContactJson))
                {
                    dto.Borrower!.Contact = JsonSerializer.Deserialize<BorrowerContactDto>(borrowerContactJson!) ?? new();
                }

                var borrowerIdentityJson = application.Borrower?.Identity;
                if (!string.IsNullOrEmpty(borrowerIdentityJson))
                {
                    dto.Borrower!.Identity = JsonSerializer.Deserialize<BorrowerIdentityDto>(borrowerIdentityJson!) ?? new();
                }

                var borrowerReferencesJson = application.Borrower?.References;
                if (!string.IsNullOrEmpty(borrowerReferencesJson))
                {
                    dto.Borrower!.References = JsonSerializer.Deserialize<List<ReferenceDto>>(borrowerReferencesJson!) ?? new();
                }

                var borrowerPreviousLoansJson = application.Borrower?.PreviousLoans;
                if (!string.IsNullOrEmpty(borrowerPreviousLoansJson))
                {
                    dto.Borrower!.PreviousLoans = JsonSerializer.Deserialize<List<PreviousLoanDto>>(borrowerPreviousLoansJson!);
                }
            }

            // Map documents
            dto.Documents = application.Documents?.Select(d => new MicrocreditApplicationDocumentDto
            {
                Id = d.Id,
                Type = d.Type.ToString(),
                Name = d.Name,
                Description = d.Description,
                FilePath = d.FilePath,
                FileSize = d.FileSize,
                MimeType = d.MimeType,
                UploadedAt = d.UploadedAt,
                UploadedBy = d.UploadedBy,
                Verified = d.Verified,
                VerifiedAt = d.VerifiedAt,
                VerifiedBy = d.VerifiedBy
            }).ToList() ?? new();

            // Map guarantees
            dto.Guarantees = application.Guarantees?.Select(g => new MicrocreditGuaranteeDto
            {
                Id = g.Id,
                Type = g.Type.ToString(),
                Description = g.Description,
                Value = g.Value,
                Currency = g.Currency.ToString(),
                Verified = g.Verified,
                VerifiedAt = g.VerifiedAt,
                VerifiedBy = g.VerifiedBy,
                CreatedAt = g.CreatedAt
            }).ToList() ?? new();

            return dto;
        }

        private async Task<string> GenerateApplicationNumberAsync()
        {
            var lastApplication = await _context.MicrocreditLoanApplications
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            var count = 1;
            if (lastApplication != null && !string.IsNullOrEmpty(lastApplication.ApplicationNumber))
            {
                var parts = lastApplication.ApplicationNumber.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out var lastNumber))
                {
                    count = lastNumber + 1;
                }
            }

            return $"APP-{DateTime.Now:yyyyMMdd}-{count:D4}";
        }

        private string ExtractAddressString(string? addressJson)
        {
            if (string.IsNullOrEmpty(addressJson)) return string.Empty;
            
            try
            {
                using var doc = JsonDocument.Parse(addressJson);
                var root = doc.RootElement;
                
                // First check if it's a simple { address: "..." } format
                if (root.TryGetProperty("address", out var addrProp))
                {
                    var simpleAddress = addrProp.GetString();
                    if (!string.IsNullOrEmpty(simpleAddress))
                        return simpleAddress;
                }
                
                // Otherwise try to extract address components
                var street = root.TryGetProperty("street", out var streetProp) ? streetProp.GetString() : null;
                var commune = root.TryGetProperty("commune", out var communeProp) ? communeProp.GetString() : null;
                var department = root.TryGetProperty("department", out var deptProp) ? deptProp.GetString() : null;
                var country = root.TryGetProperty("country", out var countryProp) ? countryProp.GetString() : null;
                
                // Build address string from components
                var parts = new List<string>();
                if (!string.IsNullOrEmpty(street)) parts.Add(street);
                if (!string.IsNullOrEmpty(commune)) parts.Add(commune);
                if (!string.IsNullOrEmpty(department)) parts.Add(department);
                if (!string.IsNullOrEmpty(country)) parts.Add(country);
                
                return string.Join(", ", parts.Where(p => !string.IsNullOrEmpty(p)));
            }
            catch
            {
                // If JSON parsing fails, try to return the raw string
                // Remove JSON formatting if it's wrapped
                var cleaned = addressJson.Trim();
                if (cleaned.StartsWith("{") && cleaned.EndsWith("}"))
                    return addressJson; // Return as-is for debugging
                return cleaned;
            }
        }

        private MicrocreditLoanDto MapLoanToDtoSync(MicrocreditLoan loan, Dictionary<string, string> savingsAccountsLookup)
        {
            // Fix for display: Use application interest rate if loan has default rate but application has specific rate
            // This fixes display for loans created before the bug fix where application rate was ignored
            decimal effectiveInterestRate = loan.InterestRate;
            decimal displayInstallmentAmount = loan.InstallmentAmount;
            decimal displayOutstandingBalance = loan.OutstandingBalance;
            decimal displayTotalAmountDue = loan.TotalAmountDue;

            if (loan.Application != null && loan.Application.InterestRate > 0 && loan.Application.InterestRate != loan.InterestRate)
            {
                // If loan has standard default rates (15% or 18%) but application has a custom rate, use the custom rate
                if (loan.InterestRate == 0.15m || loan.InterestRate == 0.18m)
                {
                    effectiveInterestRate = loan.Application.InterestRate;
                    
                    // Recalculate installment and balances for display
                    var monthlyInterestRate = effectiveInterestRate / 12;
                    var durationMonths = loan.DurationMonths;
                    var loanAmount = loan.PrincipalAmount;

                    if (monthlyInterestRate > 0 && durationMonths > 0)
                    {
                        var pmt = loanAmount * (monthlyInterestRate * (decimal)Math.Pow((double)(1 + monthlyInterestRate), durationMonths)) /
                            ((decimal)Math.Pow((double)(1 + monthlyInterestRate), durationMonths) - 1);
                        displayInstallmentAmount = Math.Round(pmt, 2);
                        
                        displayTotalAmountDue = displayInstallmentAmount * durationMonths;
                        // Recalculate outstanding balance based on new total due
                        // Note: This assumes AmountPaid is correct. If payments were made, they reduce the balance.
                        displayOutstandingBalance = Math.Max(0, displayTotalAmountDue - loan.AmountPaid);
                    }
                }
            }

            // Ensure Loan Officer name is populated
            var loanOfficerName = !string.IsNullOrEmpty(loan.LoanOfficerName) 
                ? loan.LoanOfficerName 
                : (loan.Application?.LoanOfficerName ?? "Non assigné");

            var dto = new MicrocreditLoanDto
            {
                Id = loan.Id,
                LoanNumber = loan.LoanNumber,
                ApplicationId = loan.ApplicationId,
                BorrowerId = loan.BorrowerId,
                LoanType = loan.LoanType.ToString(),
                PrincipalAmount = loan.PrincipalAmount,
                InterestRate = effectiveInterestRate,
                DurationMonths = loan.DurationMonths,
                InstallmentAmount = displayInstallmentAmount,
                Currency = loan.Currency.ToString(),
                DisbursementDate = loan.DisbursementDate,
                FirstInstallmentDate = loan.FirstInstallmentDate,
                MaturityDate = loan.MaturityDate,
                TotalAmountDue = displayTotalAmountDue,
                AmountPaid = loan.AmountPaid,
                PrincipalPaid = loan.PrincipalPaid,
                InterestPaid = loan.InterestPaid,
                PenaltiesPaid = loan.PenaltiesPaid,
                OutstandingBalance = displayOutstandingBalance,
                OutstandingPrincipal = loan.OutstandingPrincipal,
                OutstandingInterest = loan.OutstandingInterest,
                OutstandingPenalties = loan.OutstandingPenalties,
                Status = loan.Status.ToString(),
                InstallmentsPaid = loan.InstallmentsPaid,
                InstallmentsRemaining = loan.InstallmentsRemaining,
                DaysOverdue = loan.DaysOverdue,
                BranchId = loan.BranchId,
                BranchName = loan.BranchName,
                LoanOfficerId = loan.LoanOfficerId,
                LoanOfficerName = loanOfficerName,
                CreatedAt = loan.CreatedAt,
                UpdatedAt = loan.UpdatedAt,
                LastPaymentDate = loan.LastPaymentDate,
                NextPaymentDue = loan.NextPaymentDue
            };

            // Map borrower if available
            if (loan.Borrower != null)
            {
                // Get AccountNumber from application or lookup dictionary
                string accountNumber = loan.Application?.SavingsAccountNumber ?? string.Empty;
                if (string.IsNullOrEmpty(accountNumber))
                {
                    var savingsAccount = _context.SavingsAccounts
                        .FirstOrDefault(sa => sa.CustomerId == loan.Borrower.Id.ToString());
                    accountNumber = savingsAccount?.AccountNumber ?? string.Empty;
                }
                
                dto.Borrower = new MicrocreditBorrowerDto
                {
                    Id = loan.Borrower.Id,
                    AccountNumber = accountNumber,
                    FirstName = loan.Borrower.FirstName,
                    LastName = loan.Borrower.LastName,
                    DateOfBirth = loan.Borrower.DateOfBirth,
                    Gender = loan.Borrower.Gender,
                    Occupation = loan.Borrower.Occupation,
                    MonthlyIncome = loan.Borrower.MonthlyIncome,
                    EmploymentType = loan.Borrower.EmploymentType,
                    YearsInBusiness = loan.Borrower.YearsInBusiness,
                    CreditScore = loan.Borrower.CreditScore,
                    CreatedAt = loan.Borrower.CreatedAt,
                    UpdatedAt = loan.Borrower.UpdatedAt
                };

                // Parse JSON fields if available
                if (!string.IsNullOrEmpty(loan.Borrower.Address))
                {
                    try
                    {
                        dto.Borrower.Address = JsonSerializer.Deserialize<BorrowerAddressDto>(loan.Borrower.Address) ?? new();
                    }
                    catch { dto.Borrower.Address = new(); }
                }

                if (!string.IsNullOrEmpty(loan.Borrower.Contact))
                {
                    try
                    {
                        dto.Borrower.Contact = JsonSerializer.Deserialize<BorrowerContactDto>(loan.Borrower.Contact) ?? new();
                    }
                    catch { dto.Borrower.Contact = new(); }
                }

                if (!string.IsNullOrEmpty(loan.Borrower.Identity))
                {
                    try
                    {
                        dto.Borrower.Identity = JsonSerializer.Deserialize<BorrowerIdentityDto>(loan.Borrower.Identity) ?? new();
                    }
                    catch { dto.Borrower.Identity = new(); }
                }
            }

            return dto;
        }

        private MicrocreditPaymentDto MapPaymentToDto(MicrocreditPayment payment)
        {
            // Ensure we have branch info - prioritize payment's branch, fallback to loan's branch
            var branchId = payment.BranchId;
            var branchName = payment.BranchName;
            
            if (branchId == 0 || string.IsNullOrEmpty(branchName))
            {
                branchId = payment.Loan?.BranchId ?? 0;
                branchName = payment.Loan?.BranchName ?? string.Empty;
            }

            return new MicrocreditPaymentDto
            {
                Id = payment.Id,
                PaymentNumber = payment.PaymentNumber,
                Amount = payment.Amount,
                PrincipalAmount = payment.PrincipalAmount,
                InterestAmount = payment.InterestAmount,
                PenaltyAmount = payment.PenaltyAmount,
                Currency = payment.Currency.ToString(),
                PaymentDate = payment.PaymentDate,
                ValueDate = payment.PaymentDate, // Using same date for now
                Status = payment.Status.ToString(),
                PaymentMethod = payment.PaymentMethod.ToString(),
                Reference = payment.Reference,
                Notes = payment.Notes,
                ProcessedBy = payment.ProcessedBy,
                ProcessedByName = payment.ProcessedByName,
                BranchId = branchId,
                BranchName = branchName,
                ReceiptNumber = payment.ReceiptNumber,
                ReceiptPath = payment.ReceiptPath,
                CreatedAt = payment.CreatedAt,
                UpdatedAt = payment.UpdatedAt
            };
        }

        /// <summary>
        /// Upload un document pour une demande de crédit
        /// </summary>
        public async Task<MicrocreditApplicationDocumentDto> UploadDocumentAsync(
            Guid applicationId,
            IFormFile file,
            MicrocreditDocumentType documentType,
            string uploadedBy,
            string? description = null)
        {
            // Vérifier que la demande existe
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null)
                throw new KeyNotFoundException("Demande de crédit introuvable");

            // Valider le fichier
            if (file == null || file.Length == 0)
                throw new ArgumentException("Aucun fichier fourni");

            if (file.Length > 5_242_880) // 5MB
                throw new ArgumentException("Fichier trop volumineux (max 5MB)");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException($"Extension non autorisée. Extensions acceptées: {string.Join(", ", allowedExtensions)}");

            // Créer le dossier pour les documents de la demande
            var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
            var applicationFolder = Path.Combine(uploadsPath, "microcredit", "applications", applicationId.ToString(), "documents");
            if (!Directory.Exists(applicationFolder))
            {
                Directory.CreateDirectory(applicationFolder);
            }

            // Générer un nom de fichier unique
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(applicationFolder, fileName);

            // Sauvegarder le fichier
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Chemin relatif pour la base de données
            var relativePath = $"microcredit/applications/{applicationId}/documents/{fileName}";

            // Créer l'entité document
            var document = new MicrocreditApplicationDocument
            {
                Id = Guid.NewGuid(),
                ApplicationId = applicationId,
                Type = documentType,
                Name = file.FileName,
                Description = description,
                FilePath = relativePath,
                FileSize = file.Length,
                MimeType = file.ContentType,
                UploadedAt = DateTime.UtcNow,
                UploadedBy = uploadedBy,
                Verified = false
            };

            _context.MicrocreditApplicationDocuments.Add(document);
            await _context.SaveChangesAsync();

            // Mettre à jour les flags de documents dans la demande
            switch (documentType)
            {
                case MicrocreditDocumentType.IdCard:
                    application.HasNationalId = true;
                    break;
                case MicrocreditDocumentType.ProofOfIncome:
                    application.HasProofOfIncome = true;
                    break;
                case MicrocreditDocumentType.CollateralDocument:
                    application.HasCollateralDocs = true;
                    break;
                case MicrocreditDocumentType.BankStatements:
                    application.HasProofOfResidence = true;
                    break;
            }
            await _context.SaveChangesAsync();

            return new MicrocreditApplicationDocumentDto
            {
                Id = document.Id,
                Type = document.Type.ToString(),
                Name = document.Name,
                Description = document.Description,
                FilePath = document.FilePath,
                FileSize = document.FileSize,
                MimeType = document.MimeType,
                UploadedAt = document.UploadedAt,
                UploadedBy = document.UploadedBy,
                Verified = document.Verified,
                VerifiedAt = document.VerifiedAt,
                VerifiedBy = document.VerifiedBy
            };
        }

        /// <summary>
        /// Obtenir les documents d'une demande de crédit
        /// </summary>
        public async Task<List<MicrocreditApplicationDocumentDto>> GetApplicationDocumentsAsync(Guid applicationId)
        {
            var documents = await _context.MicrocreditApplicationDocuments
                .Where(d => d.ApplicationId == applicationId)
                .OrderByDescending(d => d.UploadedAt)
                .ToListAsync();

            return documents.Select(d => new MicrocreditApplicationDocumentDto
            {
                Id = d.Id,
                Type = d.Type.ToString(),
                Name = d.Name,
                Description = d.Description,
                FilePath = d.FilePath,
                FileSize = d.FileSize,
                MimeType = d.MimeType,
                UploadedAt = d.UploadedAt,
                UploadedBy = d.UploadedBy,
                Verified = d.Verified,
                VerifiedAt = d.VerifiedAt,
                VerifiedBy = d.VerifiedBy
            }).ToList();
        }

        /// <summary>
        /// Supprimer un document d'une demande de crédit
        /// </summary>
        public async Task DeleteDocumentAsync(Guid documentId, string deletedBy)
        {
            var document = await _context.MicrocreditApplicationDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (document == null)
                throw new KeyNotFoundException("Document introuvable");

            // Supprimer le fichier physique
            await _fileStorageService.DeleteFileAsync(document.FilePath);

            // Supprimer de la base de données
            _context.MicrocreditApplicationDocuments.Remove(document);
            await _context.SaveChangesAsync();

            // Mettre à jour les flags de documents dans la demande si nécessaire
            var application = await _context.MicrocreditLoanApplications
                .Include(a => a.Documents)
                .FirstOrDefaultAsync(a => a.Id == document.ApplicationId);

            if (application != null)
            {
                // Recalculer les flags basés sur les documents restants
                application.HasNationalId = application.Documents.Any(d => d.Type == MicrocreditDocumentType.IdCard && d.Verified);
                application.HasProofOfIncome = application.Documents.Any(d => d.Type == MicrocreditDocumentType.ProofOfIncome && d.Verified);
                application.HasCollateralDocs = application.Documents.Any(d => d.Type == MicrocreditDocumentType.CollateralDocument && d.Verified);
                application.HasProofOfResidence = application.Documents.Any(d =>
                    (d.Type == MicrocreditDocumentType.BankStatements) && d.Verified);

                await _context.SaveChangesAsync();
            }
        }
    }
}