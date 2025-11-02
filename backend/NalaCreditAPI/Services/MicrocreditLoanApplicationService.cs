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
        Task<MicrocreditLoanApplicationDto> ApproveApplicationAsync(Guid id, string approverId, string comments, decimal? approvedAmount = null);
        Task<MicrocreditLoanApplicationDto> RejectApplicationAsync(Guid id, string rejectedBy, string reason);
        Task<RiskAssessmentDto> CalculateRiskAssessmentAsync(Guid applicationId);
        Task<bool> ValidateApplicationAsync(Guid id);

        // Gestion des prêts
        Task<MicrocreditLoanDto?> GetLoanAsync(Guid id);
        Task<MicrocreditLoanListResponseDto> GetLoansAsync(int page, int pageSize, 
            MicrocreditLoanStatus? status = null, MicrocreditLoanType? loanType = null, 
            int? branchId = null, bool? isOverdue = null);
        Task<List<MicrocreditLoanDto>> GetCustomerLoansAsync(Guid customerId);
        Task<MicrocreditLoanDto> DisburseLoanAsync(Guid loanId, string disbursedBy, DateTime disbursementDate, string? notes = null);
        Task<List<MicrocreditPaymentScheduleDto>> GetPaymentScheduleAsync(Guid loanId);
        Task<MicrocreditLoanDto> MarkLoanAsDefaultAsync(Guid loanId, string markedBy, string reason);
        Task<MicrocreditLoanDto> RehabilitateLoanAsync(Guid loanId, string rehabilitatedBy, string? notes = null);
        Task<LoanSummaryDto?> GetLoanSummaryAsync(Guid loanId);
        Task<List<MicrocreditPaymentDto>> GetLoanTransactionsAsync(Guid loanId);
        Task<List<OverdueLoanDto>> GetOverdueLoansAsync(int daysOverdue = 1);

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
    }

    public class MicrocreditLoanApplicationService : IMicrocreditLoanApplicationService
    {
        private readonly ApplicationDbContext _context;

        public MicrocreditLoanApplicationService(ApplicationDbContext context)
        {
            _context = context;
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

            return MapToDto(application);
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

            return new MicrocreditApplicationListResponseDto
            {
                Applications = applications.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                TotalPages = totalPages,
                CurrentPage = page,
                PageSize = pageSize
            };
        }

        public async Task<MicrocreditLoanApplicationDto> CreateApplicationAsync(CreateMicrocreditLoanApplicationDto dto, string userId)
        {
            var borrower = await _context.MicrocreditBorrowers.FindAsync(dto.BorrowerId);
            if (borrower == null)
                throw new ArgumentException("Borrower not found");

            // Calculate debt-to-income ratio
            var debtToIncomeRatio = dto.ExistingDebts / dto.MonthlyIncome;

            var application = new MicrocreditLoanApplication
            {
                Id = Guid.NewGuid(),
                ApplicationNumber = await GenerateApplicationNumberAsync(),
                BorrowerId = dto.BorrowerId,
                LoanType = dto.LoanType,
                RequestedAmount = dto.RequestedAmount,
                RequestedDurationMonths = dto.RequestedDurationMonths,
                Purpose = dto.Purpose,
                BusinessPlan = dto.BusinessPlan,
                Currency = dto.Currency,
                BranchId = dto.BranchId,
                BranchName = "Main Branch", // TODO: Get from branch service
                MonthlyIncome = dto.MonthlyIncome,
                MonthlyExpenses = dto.MonthlyExpenses,
                ExistingDebts = dto.ExistingDebts,
                CollateralValue = dto.CollateralValue,
                DebtToIncomeRatio = debtToIncomeRatio,
                Status = MicrocreditApplicationStatus.Draft,
                LoanOfficerId = userId,
                LoanOfficerName = "Officer" // TODO: Get from user service
            };

            _context.MicrocreditLoanApplications.Add(application);
            await _context.SaveChangesAsync();

            return await GetApplicationAsync(application.Id) ?? throw new InvalidOperationException("Failed to retrieve created application");
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

            // Recalculate debt-to-income ratio
            application.DebtToIncomeRatio = dto.MonthlyIncome > 0 
                ? (dto.ExistingDebts + (dto.RequestedAmount / dto.RequestedDurationMonths)) / dto.MonthlyIncome 
                : 0;

            application.UpdatedAt = DateTime.UtcNow;

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

        public async Task<MicrocreditLoanApplicationDto> ApproveApplicationAsync(Guid id, string approverId, string comments, decimal? approvedAmount = null)
        {
            var application = await _context.MicrocreditLoanApplications
                .FirstOrDefaultAsync(a => a.Id == id);

            if (application == null)
                throw new ArgumentException("Application not found");

            if (application.Status != MicrocreditApplicationStatus.UnderReview &&
                application.Status != MicrocreditApplicationStatus.Submitted)
                throw new InvalidOperationException("Application is not in a reviewable state");

            application.Status = MicrocreditApplicationStatus.Approved;
            application.ApprovedAt = DateTime.UtcNow;
            application.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve approved application");
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

            application.Status = MicrocreditApplicationStatus.Rejected;
            application.RejectedAt = DateTime.UtcNow;
            application.RejectionReason = reason;
            application.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetApplicationAsync(id) ?? throw new InvalidOperationException("Failed to retrieve rejected application");
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

            // Check for required documents (at least ID and proof of income)
            var hasIdDocument = application.Documents.Any(d => d.Type == MicrocreditDocumentType.IdCard && d.Verified);
            var hasIncomeProof = application.Documents.Any(d => d.Type == MicrocreditDocumentType.ProofOfIncome && d.Verified);

            return hasIdDocument && hasIncomeProof;
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

            return MapLoanToDto(loan);
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

            return new MicrocreditLoanListResponseDto
            {
                Loans = loans.Select(MapLoanToDto).ToList(),
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

            return loans.Select(MapLoanToDto).ToList();
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

            // Update loan status and disbursement info
            loan.Status = MicrocreditLoanStatus.Active;
            loan.DisbursementDate = DateOnly.FromDateTime(disbursementDate);
            loan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return MapLoanToDto(loan);
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

            return MapLoanToDto(loan);
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

            return MapLoanToDto(loan);
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
            var loan = await _context.MicrocreditLoans
                .Include(l => l.Borrower)
                .FirstOrDefaultAsync(l => l.Id == dto.LoanId);

            if (loan == null)
                throw new InvalidOperationException($"Loan with ID {dto.LoanId} not found");

            if (loan.Status != MicrocreditLoanStatus.Active && loan.Status != MicrocreditLoanStatus.Defaulted)
                throw new InvalidOperationException("Payments can only be recorded for active or defaulted loans");

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
                PaymentMethod = dto.PaymentMethod,
                Status = MicrocreditPaymentStatus.Pending,
                Reference = dto.Reference,
                Notes = dto.Notes,
                ProcessedBy = recordedBy,
                ProcessedByName = recordedBy, // Would come from user service
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

            _context.MicrocreditPayments.Add(payment);
            await _context.SaveChangesAsync();

            // Return with loan info
            payment.Loan = loan;
            return MapPaymentToDto(payment);
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
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
                throw new InvalidOperationException($"Payment with ID {paymentId} not found");

            if (payment.Status != MicrocreditPaymentStatus.Pending)
                throw new InvalidOperationException("Only pending payments can be confirmed");

            // Confirm the payment
            payment.Status = MicrocreditPaymentStatus.Completed;
            payment.UpdatedAt = DateTime.Now;
            
            if (!string.IsNullOrEmpty(notes))
                payment.Notes = $"{payment.Notes}\nConfirmed: {notes}";

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
                ProcessedByName = processedBy,
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

        // Méthodes privées utiles
        private MicrocreditLoanApplicationDto MapToDto(MicrocreditLoanApplication application)
        {
            var dto = new MicrocreditLoanApplicationDto
            {
                Id = application.Id,
                ApplicationNumber = application.ApplicationNumber,
                BorrowerId = application.BorrowerId,
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
                CurrentApprovalLevel = application.CurrentApprovalLevel.ToString()
            };

            // Map borrower if available
            if (application.Borrower != null)
            {
                dto.Borrower = new MicrocreditBorrowerDto
                {
                    Id = application.Borrower.Id,
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
                    UpdatedAt = application.Borrower.UpdatedAt
                };

                // Parse JSON fields if available
                if (!string.IsNullOrEmpty(application.Borrower.Address))
                {
                    dto.Borrower.Address = JsonSerializer.Deserialize<BorrowerAddressDto>(application.Borrower.Address) ?? new();
                }

                if (!string.IsNullOrEmpty(application.Borrower.Contact))
                {
                    dto.Borrower.Contact = JsonSerializer.Deserialize<BorrowerContactDto>(application.Borrower.Contact) ?? new();
                }

                if (!string.IsNullOrEmpty(application.Borrower.Identity))
                {
                    dto.Borrower.Identity = JsonSerializer.Deserialize<BorrowerIdentityDto>(application.Borrower.Identity) ?? new();
                }

                if (!string.IsNullOrEmpty(application.Borrower.References))
                {
                    dto.Borrower.References = JsonSerializer.Deserialize<List<ReferenceDto>>(application.Borrower.References) ?? new();
                }

                if (!string.IsNullOrEmpty(application.Borrower.PreviousLoans))
                {
                    dto.Borrower.PreviousLoans = JsonSerializer.Deserialize<List<PreviousLoanDto>>(application.Borrower.PreviousLoans);
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

            // Map approval steps
            dto.ApprovalSteps = application.ApprovalSteps?.Select(s => new MicrocreditApprovalStepDto
            {
                Id = s.Id,
                Level = s.Level.ToString(),
                ApproverId = s.ApproverId,
                ApproverName = s.ApproverName,
                Status = s.Status,
                Comments = s.Comments,
                RequiredAmount = s.RequiredAmount,
                ProcessedAt = s.ProcessedAt,
                CreatedAt = s.CreatedAt
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

        private MicrocreditLoanDto MapLoanToDto(MicrocreditLoan loan)
        {
            var dto = new MicrocreditLoanDto
            {
                Id = loan.Id,
                LoanNumber = loan.LoanNumber,
                ApplicationId = loan.ApplicationId,
                BorrowerId = loan.BorrowerId,
                LoanType = loan.LoanType.ToString(),
                PrincipalAmount = loan.PrincipalAmount,
                InterestRate = loan.InterestRate,
                DurationMonths = loan.DurationMonths,
                InstallmentAmount = loan.InstallmentAmount,
                Currency = loan.Currency.ToString(),
                DisbursementDate = loan.DisbursementDate,
                FirstInstallmentDate = loan.FirstInstallmentDate,
                MaturityDate = loan.MaturityDate,
                TotalAmountDue = loan.TotalAmountDue,
                AmountPaid = loan.AmountPaid,
                PrincipalPaid = loan.PrincipalPaid,
                InterestPaid = loan.InterestPaid,
                PenaltiesPaid = loan.PenaltiesPaid,
                OutstandingBalance = loan.OutstandingBalance,
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
                LoanOfficerName = loan.LoanOfficerName,
                CreatedAt = loan.CreatedAt,
                UpdatedAt = loan.UpdatedAt,
                LastPaymentDate = loan.LastPaymentDate,
                NextPaymentDue = loan.NextPaymentDue
            };

            // Map borrower if available
            if (loan.Borrower != null)
            {
                dto.Borrower = new MicrocreditBorrowerDto
                {
                    Id = loan.Borrower.Id,
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
                BranchId = payment.BranchId,
                BranchName = payment.BranchName,
                ReceiptNumber = payment.ReceiptNumber,
                ReceiptPath = payment.ReceiptPath,
                CreatedAt = payment.CreatedAt,
                UpdatedAt = payment.UpdatedAt
            };
        }
    }
}