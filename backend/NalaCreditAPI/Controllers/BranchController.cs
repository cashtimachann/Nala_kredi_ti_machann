using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BranchController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<BranchController> _logger;
        private readonly IBranchService _branchService;

        public BranchController(ApplicationDbContext context, ILogger<BranchController> logger, IBranchService branchService)
        {
            _context = context;
            _logger = logger;
            _branchService = branchService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BranchDto>>> GetAllBranches()
        {
            try
            {
                var branchDtos = await _branchService.GetAllBranchesAsync();
                return Ok(branchDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAllBranches failed");
                return StatusCode(500, new { message = "Erreur lors du chargement des succursales", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BranchDto>> GetBranch(int id)
        {
            try
            {
                var dto = await _branchService.GetBranchAsync(id);
                return Ok(dto);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Succursale non trouvée" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetBranch failed for {BranchId}", id);
                return StatusCode(500, new { message = "Erreur lors du chargement de la succursale", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<BranchDto>> CreateBranch(CreateBranchDto createBranchDto)
        {
            try
            {
                if (string.IsNullOrEmpty(createBranchDto.Code))
                {
                    createBranchDto.Code = GenerateBranchCodeFallback(createBranchDto.Name);
                }
                var dto = await _branchService.CreateBranchAsync(createBranchDto);
                return CreatedAtAction(nameof(GetBranch), new { id = dto.Id }, dto);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateBranch failed");
                return StatusCode(500, new { message = "Erreur lors de la création de la succursale", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<BranchDto>> UpdateBranch(int id, UpdateBranchDto updateBranchDto)
        {
            try
            {
                var result = await _branchService.UpdateBranchAsync(id, updateBranchDto);
                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Succursale non trouvée" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (FormatException ex)
            {
                _logger.LogWarning(ex, "FormatException lors de la modification de la succursale {BranchId}", id);
                return BadRequest(new { message = "Format de donnée invalide pour la succursale", error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateBranch failed for branch {BranchId}", id);
                return StatusCode(500, new { message = "Erreur lors de la modification de la succursale", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteBranch(int id)
        {
            try
            {
                var branch = await _context.Branches.FindAsync(id);
                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                // Check if branch has users or transactions
                var hasUsers = await _context.Users.AnyAsync(u => u.BranchId == id);
                if (hasUsers)
                {
                    return BadRequest(new { message = "Impossible de supprimer une succursale avec des employés assignés" });
                }

                _context.Branches.Remove(branch);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Succursale supprimée avec succès" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la suppression de la succursale", error = ex.Message });
            }
        }

        [HttpPost("{id}/activate")]
        public async Task<ActionResult> ActivateBranch(int id)
        {
            try
            {
                var branch = await _context.Branches.FindAsync(id);
                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                branch.IsActive = true;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Succursale activée avec succès" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de l'activation", error = ex.Message });
            }
        }

        [HttpPost("{id}/deactivate")]
        public async Task<ActionResult> DeactivateBranch(int id)
        {
            try
            {
                var branch = await _context.Branches.FindAsync(id);
                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                branch.IsActive = false;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Succursale désactivée avec succès" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la désactivation", error = ex.Message });
            }
        }

        [HttpPost("{branchId}/assign-manager")]
        public async Task<ActionResult> AssignManager(int branchId, AssignManagerDto assignManagerDto)
        {
            try
            {
                var branch = await _context.Branches.FindAsync(branchId);
                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                var manager = await _context.Users.FindAsync(assignManagerDto.ManagerId);
                if (manager == null)
                {
                    return NotFound(new { message = "Utilisateur non trouvé" });
                }

                // Update manager's branch assignment
                manager.BranchId = branchId;

                // Also set branch.ManagerId and branch.ManagerName for consistency
                branch.ManagerId = manager.Id;
                branch.ManagerName = $"{manager.FirstName ?? string.Empty} {manager.LastName ?? string.Empty}".Trim();

                await _context.SaveChangesAsync();

                return Ok(new { message = "Responsable assigné avec succès" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de l'assignation", error = ex.Message });
            }
        }

        [HttpPost("generate-code")]
        public async Task<ActionResult<GenerateCodeResponseDto>> GenerateCode(GenerateCodeDto request)
        {
            try
            {
                var code = await GenerateBranchCodeFromName(request.Name);
                return Ok(new GenerateCodeResponseDto { Code = code });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la génération du code", error = ex.Message });
            }
        }

        [HttpPost("validate-code")]
        public async Task<ActionResult<ValidateCodeResponseDto>> ValidateCode(ValidateCodeDto request)
        {
            try
            {
                var exists = await _context.Branches.AnyAsync(b => b.Code == request.Code);
                return Ok(new ValidateCodeResponseDto { IsValid = !exists });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la validation", error = ex.Message });
            }
        }

        [HttpGet("{branchId}/history")]
        public Task<ActionResult<IEnumerable<BranchHistoryDto>>> GetBranchHistory(int branchId)
        {
            // Synchronous stub; no await required. Converted to Task.FromResult to remove CS1998 warning.
            var history = new List<BranchHistoryDto>();
            ActionResult<IEnumerable<BranchHistoryDto>> result = Ok(history);
            return Task.FromResult(result);
        }

        // Mapping now centralized in BranchService.MapToDto; keep fallback generator for code only

        private string GenerateBranchCodeFallback(string name)
        {
            var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var code = string.Join("", words.Select(w => w.Substring(0, Math.Min(3, w.Length)).ToUpper()));
            return string.IsNullOrWhiteSpace(code) ? $"BR-{Guid.NewGuid().ToString()[..6].ToUpper()}" : code;
        }

        private async Task<string> GenerateBranchCodeFromName(string name)
        {
            var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var baseCode = string.Join("", words.Select(w => w.Substring(0, Math.Min(3, w.Length)).ToUpper()));
            if (string.IsNullOrWhiteSpace(baseCode))
            {
                baseCode = "BR";
            }
            var code = baseCode;
            var counter = 1;
            while (await _context.Branches.AnyAsync(b => b.Code == code))
            {
                code = $"{baseCode}{counter:D2}";
                counter++;
            }
            return code;
        }

        // ========================================
        // BRANCH MANAGER DASHBOARD ENDPOINTS
        // ========================================

        /// <summary>
        /// Get dashboard statistics for branch manager
        /// GET /api/branch/dashboard/stats
        /// </summary>
        [HttpGet("dashboard/stats")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult<object>> GetDashboardStats()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }

                var user = await _context.Users
                    .Include(u => u.Branch)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var branchId = user.BranchId.Value;
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);

                // Get today's transaction count
                var todayTransactions = await _context.Transactions
                    .Where(t => t.BranchId == branchId && t.CreatedAt >= today && t.CreatedAt < tomorrow)
                    .CountAsync();

                // Get active cashiers count
                var totalCashiers = await _context.Users
                    .Where(u => u.BranchId == branchId && u.Role == UserRole.Cashier && u.IsActive)
                    .CountAsync();

                var activeCashiers = await _context.CashSessions
                    .Where(cs => cs.BranchId == branchId && cs.Status == CashSessionStatus.Open && cs.SessionStart >= today && cs.SessionStart < tomorrow)
                    .Select(cs => cs.UserId)
                    .Distinct()
                    .CountAsync();

                // Get pending approvals count (accounts + loans)
                // Note: CurrentAccount doesn't have PendingApproval status in the system
                var pendingAccounts = 0;

                var pendingLoans = await _context.MicrocreditLoanApplications
                    .Where(l => l.BranchId == branchId && l.Status == MicrocreditApplicationStatus.UnderReview)
                    .CountAsync();

                var pendingApprovals = pendingAccounts + pendingLoans;

                // Get new accounts today
                var newAccountsToday = await _context.CurrentAccounts
                    .Where(ca => ca.BranchId == branchId && ca.CreatedAt >= today && ca.CreatedAt < tomorrow)
                    .CountAsync();

                // Get active loans
                var activeLoans = await _context.MicrocreditLoans
                    .Where(l => l.BranchId == branchId && l.Status == MicrocreditLoanStatus.Active)
                    .CountAsync();

                // Get present staff
                var totalStaff = await _context.Users
                    .Where(u => u.BranchId == branchId && u.IsActive && u.Role != UserRole.SuperAdmin)
                    .CountAsync();

                var presentStaff = totalStaff; // TODO: Implement real attendance tracking

                var stats = new
                {
                    totalTransactions = todayTransactions,
                    activeCashiers = $"{activeCashiers}/{totalCashiers}",
                    pendingApprovals = pendingApprovals,
                    performanceScore = "85%", // TODO: Calculate real performance
                    cashBalanceHTG = "0", // TODO: Calculate from cash sessions
                    cashBalanceUSD = "0",
                    newAccounts = newAccountsToday,
                    activeLoans = activeLoans,
                    staffPresent = $"{presentStaff}/{totalStaff}",
                    alerts = pendingApprovals > 5 ? 1 : 0
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get pending validations for branch
        /// GET /api/branch/validations/pending
        /// </summary>
        [HttpGet("validations/pending")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult<object>> GetPendingValidations()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var branchId = user.BranchId.Value;
                var validations = new List<object>();

                // Note: CurrentAccount doesn't have PendingApproval status, so we skip account validation

                // Get pending loan applications
                var pendingLoans = await _context.MicrocreditLoanApplications
                    .Include(l => l.Borrower)
                    .Where(l => l.BranchId == branchId && l.Status == MicrocreditApplicationStatus.UnderReview)
                    .OrderBy(l => l.SubmittedAt)
                    .Take(10)
                    .ToListAsync();

                foreach (var loan in pendingLoans)
                {
                    validations.Add(new
                    {
                        type = "Demande Prêt",
                        description = $"Client: {loan.Borrower.FirstName} {loan.Borrower.LastName} - Montant: {loan.RequestedAmount:N0} {loan.Currency}"
                    });
                }

                return Ok(validations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get active cash sessions
        /// GET /api/branch/cash-sessions/active
        /// </summary>
        [HttpGet("cash-sessions/active")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult<object>> GetActiveCashSessions()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var branchId = user.BranchId.Value;
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);

                var activeSessions = await _context.CashSessions
                    .Include(cs => cs.User)
                    .Where(cs => cs.BranchId == branchId && cs.Status == CashSessionStatus.Open && cs.SessionStart >= today && cs.SessionStart < tomorrow)
                    .Select(cs => new
                    {
                        cashier = $"{cs.User.FirstName} {cs.User.LastName}",
                        startTime = cs.SessionStart.ToString("HH:mm"),
                        transCount = _context.Transactions
                            .Count(t => t.UserId == cs.UserId && 
                                       t.CreatedAt >= today && t.CreatedAt < tomorrow &&
                                       t.BranchId == branchId)
                            .ToString()
                    })
                    .ToListAsync();

                return Ok(activeSessions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get team performance
        /// GET /api/branch/team/performance
        /// </summary>
        [HttpGet("team/performance")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult<object>> GetTeamPerformance()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var branchId = user.BranchId.Value;
                var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

                var teamMembers = await _context.Users
                    .Where(u => u.BranchId == branchId && 
                               u.IsActive && 
                               u.Role != UserRole.Admin &&
                               u.Role != UserRole.SuperAdmin)
                    .Select(u => new
                    {
                        name = $"{u.FirstName} {u.LastName}",
                        role = GetRoleName(u.Role),
                        score = "85%" // TODO: Calculate real score
                    })
                    .Take(10)
                    .ToListAsync();

                return Ok(teamMembers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        // NOTE: Account approval endpoints NOT IMPLEMENTED
        // CurrentAccount model doesn't have PendingApproval status - accounts are created as Active
        // If approval workflow is needed, would require:
        //   1. Add PendingApproval to ClientAccountStatus enum
        //   2. Add ApprovedBy, ApprovedAt, RejectedBy, RejectedAt to CurrentAccount model
        //   3. Implement GET /api/branch/accounts/pending
        //   4. Implement POST /api/branch/accounts/{id}/approve
        //   5. Implement POST /api/branch/accounts/{id}/reject

        /// <summary>
        /// Get pending loans for approval
        /// GET /api/branch/loans/pending
        /// </summary>
        [HttpGet("loans/pending")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult<object>> GetPendingLoans()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var branchId = user.BranchId.Value;

                var pendingLoans = await _context.MicrocreditLoanApplications
                    .Include(l => l.Borrower)
                    .Where(l => l.BranchId == branchId && l.Status == MicrocreditApplicationStatus.UnderReview)
                    .OrderBy(l => l.SubmittedAt)
                    .Select(l => new
                    {
                        id = l.Id,
                        applicationNumber = l.ApplicationNumber,
                        clientName = l.Borrower.FirstName + " " + l.Borrower.LastName,
                        loanType = l.LoanType.ToString(),
                        amount = l.RequestedAmount,
                        duration = l.RequestedDurationMonths,
                        requestDate = l.SubmittedAt,
                        currency = l.Currency.ToString()
                    })
                    .ToListAsync();

                return Ok(pendingLoans);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Approve a loan
        /// POST /api/branch/loans/{id}/approve
        /// </summary>
        [HttpPost("loans/{id}/approve")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult> ApproveLoan(Guid id)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var application = await _context.MicrocreditLoanApplications
                    .FirstOrDefaultAsync(l => l.Id == id && l.BranchId == user.BranchId);

                if (application == null)
                {
                    return NotFound(new { message = "Loan application not found" });
                }

                if (application.Status != MicrocreditApplicationStatus.UnderReview)
                {
                    return BadRequest(new { message = "Loan application is not under review" });
                }

                application.Status = MicrocreditApplicationStatus.Approved;
                application.ApprovedAt = DateTime.UtcNow;
                application.ReviewedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Loan application approved successfully", applicationId = application.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Reject a loan
        /// POST /api/branch/loans/{id}/reject
        /// </summary>
        [HttpPost("loans/{id}/reject")]
        [Authorize(Policy = "RequireManagerOrAbove")]
        public async Task<ActionResult> RejectLoan(Guid id, [FromBody] RejectLoanRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user?.BranchId == null)
                {
                    return BadRequest(new { message = "User not assigned to a branch" });
                }

                var application = await _context.MicrocreditLoanApplications
                    .FirstOrDefaultAsync(l => l.Id == id && l.BranchId == user.BranchId);

                if (application == null)
                {
                    return NotFound(new { message = "Loan application not found" });
                }

                if (application.Status != MicrocreditApplicationStatus.UnderReview)
                {
                    return BadRequest(new { message = "Loan application is not under review" });
                }

                application.Status = MicrocreditApplicationStatus.Rejected;
                application.RejectedAt = DateTime.UtcNow;
                application.ReviewedAt = DateTime.UtcNow;
                application.RejectionReason = request.Reason;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Loan application rejected successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get financial summary for a branch including all deposits and withdrawals
        /// Aggregates across generic Transactions, SavingsTransactions, CurrentAccountTransactions and TermSavingsTransactions
        /// </summary>
        [HttpGet("{id}/financial-summary")]
        public async Task<ActionResult<BranchFinancialSummaryDto>> GetBranchFinancialSummary(int id)
        {
            try
            {
                var branch = await _context.Branches.FindAsync(id);
                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                // Helper method to standardize currency comparison
                bool IsHTG(object currency) => currency switch
                {
                    Currency c => c == Currency.HTG,
                    SavingsCurrency sc => sc == SavingsCurrency.HTG,
                    ClientCurrency cc => cc == ClientCurrency.HTG,
                    _ => false
                };

                bool IsUSD(object currency) => currency switch
                {
                    Currency c => c == Currency.USD,
                    SavingsCurrency sc => sc == SavingsCurrency.USD,
                    ClientCurrency cc => cc == ClientCurrency.USD,
                    _ => false
                };

                // Base transactions (generic)
                var baseTx = await _context.Transactions
                    .Where(t => t.BranchId == id && t.Status == TransactionStatus.Completed)
                    .ToListAsync();

                // Savings transactions
                var savingsTx = await _context.SavingsTransactions
                    .Where(t => t.BranchId == id && t.Status == SavingsTransactionStatus.Completed)
                    .ToListAsync();

                // Current account transactions
                var currentTx = await _context.CurrentAccountTransactions
                    .Where(t => t.BranchId == id && t.Status == SavingsTransactionStatus.Completed)
                    .ToListAsync();

                // Term savings transactions
                var termTx = await _context.TermSavingsTransactions
                    .Where(t => t.BranchId == id && t.Status == SavingsTransactionStatus.Completed)
                    .ToListAsync();

                // Inter-branch transfers (completed)
                var transfers = await _context.InterBranchTransfers
                    .Where(t => (t.FromBranchId == id || t.ToBranchId == id) && t.Status == TransferStatus.Completed)
                    .ToListAsync();

                // HTG totals
                var htgDeposits = 0m
                    + baseTx.Where(t => t.Type == TransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + savingsTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + currentTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + termTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + transfers.Where(t => t.ToBranchId == id && IsHTG(t.Currency)).Sum(t => t.Amount);

                var htgWithdrawals = 0m
                    + baseTx.Where(t => t.Type == TransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + savingsTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + currentTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + termTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                    + transfers.Where(t => t.FromBranchId == id && IsHTG(t.Currency)).Sum(t => t.Amount);

                // USD totals
                var usdDeposits = 0m
                    + baseTx.Where(t => t.Type == TransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + savingsTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + currentTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + termTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + transfers.Where(t => t.ToBranchId == id && IsUSD(t.Currency)).Sum(t => t.Amount);

                var usdWithdrawals = 0m
                    + baseTx.Where(t => t.Type == TransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + savingsTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + currentTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + termTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                    + transfers.Where(t => t.FromBranchId == id && IsUSD(t.Currency)).Sum(t => t.Amount);

                // Total count and last date across all
                var totalCount = baseTx.Count + savingsTx.Count + currentTx.Count + termTx.Count + transfers.Count;
                var lastDateCandidates = new List<DateTime>();
                if (baseTx.Any()) lastDateCandidates.Add(baseTx.Max(t => t.CreatedAt));
                if (savingsTx.Any()) lastDateCandidates.Add(savingsTx.Max(t => t.ProcessedAt));
                if (currentTx.Any()) lastDateCandidates.Add(currentTx.Max(t => t.ProcessedAt));
                if (termTx.Any()) lastDateCandidates.Add(termTx.Max(t => t.ProcessedAt));
                if (transfers.Any()) lastDateCandidates.Add(transfers.Max(t => t.CreatedAt));
                var lastDate = lastDateCandidates.Any() ? lastDateCandidates.Max() : DateTime.MinValue;

                var summary = new BranchFinancialSummaryDto
                {
                    BranchId = id,
                    BranchName = branch.Name,
                    TotalDepositHTG = htgDeposits,
                    TotalWithdrawalHTG = htgWithdrawals,
                    BalanceHTG = htgDeposits - htgWithdrawals,
                    TotalDepositUSD = usdDeposits,
                    TotalWithdrawalUSD = usdWithdrawals,
                    BalanceUSD = usdDeposits - usdWithdrawals,
                    TotalTransactions = totalCount,
                    LastTransactionDate = lastDate
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetBranchFinancialSummary failed for branch {BranchId}", id);
                return StatusCode(500, new { message = "Erreur lors du chargement du résumé financier", error = ex.Message });
            }
        }

        public class RejectLoanRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        private string GetRoleName(UserRole role)
        {
            return role switch
            {
                UserRole.Cashier => "Caissier",
                UserRole.Employee => "Employé",
                UserRole.Manager => "Chef Succursale",
                UserRole.Admin => "Administrateur",
                UserRole.SupportTechnique => "Support Technique",
                UserRole.SuperAdmin => "Super Admin",
                _ => role.ToString()
            };
        }
    }
}