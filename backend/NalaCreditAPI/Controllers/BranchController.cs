using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BranchController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public BranchController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BranchDto>>> GetAllBranches()
        {
            try
            {
            var branches = await _context.Branches
                .Include(b => b.Users)
                .Include(b => b.Manager)
                .ToListAsync();                var branchDtos = branches.Select(MapToBranchDto).ToList();
                return Ok(branchDtos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement des succursales", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BranchDto>> GetBranch(int id)
        {
            try
            {
                var branch = await _context.Branches
                    .Include(b => b.Users)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                return Ok(MapToBranchDto(branch));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement de la succursale", error = ex.Message });
            }
        }

        [HttpPost]
        public async Task<ActionResult<BranchDto>> CreateBranch(CreateBranchDto createBranchDto)
        {
            try
            {
                // Generate code if not provided
                if (string.IsNullOrEmpty(createBranchDto.Code))
                {
                    createBranchDto.Code = await GenerateBranchCodeFromName(createBranchDto.Name);
                }

                // Check if code already exists
                var existingBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Code == createBranchDto.Code);
                if (existingBranch != null)
                {
                    return BadRequest(new { message = "Ce code de succursale existe déjà" });
                }

                var branch = new Branch
                {
                    Name = createBranchDto.Name,
                    Code = createBranchDto.Code,
                    Address = createBranchDto.Address,
                    Commune = createBranchDto.Commune,
                    Phones = createBranchDto.Phones,
                    Region = createBranchDto.Department,
                    Email = createBranchDto.Email,
                    OpeningDate = DateTime.TryParse(createBranchDto.OpeningDate, out var openingDate) ? openingDate : DateTime.UtcNow,
                    ManagerId = createBranchDto.ManagerId,
                    MaxEmployees = createBranchDto.MaxEmployees,
                    PrimaryCurrency = Currency.HTG,
                    DailyWithdrawalLimit = createBranchDto.Limits.DailyWithdrawalLimit,
                    DailyDepositLimit = createBranchDto.Limits.DailyDepositLimit,
                    MaxLocalCreditApproval = createBranchDto.Limits.MaxLocalCreditApproval,
                    MinCashReserveHTG = createBranchDto.Limits.MinCashReserveHTG,
                    MinCashReserveUSD = createBranchDto.Limits.MinCashReserveUSD,
                    OpenTime = TimeSpan.TryParse(createBranchDto.OperatingHours.OpenTime, out var openTime) ? openTime : new TimeSpan(8, 0, 0),
                    CloseTime = TimeSpan.TryParse(createBranchDto.OperatingHours.CloseTime, out var closeTime) ? closeTime : new TimeSpan(17, 0, 0),
                    ClosedDays = createBranchDto.OperatingHours.ClosedDays ?? new List<int>(),
                    IsActive = createBranchDto.Status == "Active",
                    CreatedAt = DateTime.UtcNow
                };

                _context.Branches.Add(branch);
                await _context.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetBranch),
                    new { id = branch.Id },
                    MapToBranchDto(branch));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors de la création de la succursale", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<BranchDto>> UpdateBranch(int id, UpdateBranchDto updateBranchDto)
        {
            try
            {
                var branch = await _context.Branches.FindAsync(id);
                if (branch == null)
                {
                    return NotFound(new { message = "Succursale non trouvée" });
                }

                // Check if code is already used by another branch
                if (!string.IsNullOrEmpty(updateBranchDto.Code))
                {
                    var existingBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Code == updateBranchDto.Code && b.Id != id);
                    if (existingBranch != null)
                    {
                        return BadRequest(new { message = "Ce code de succursale est déjà utilisé par une autre succursale" });
                    }
                }

                branch.Name = updateBranchDto.Name;
                branch.Code = updateBranchDto.Code;
                branch.Address = updateBranchDto.Address;
                branch.Commune = updateBranchDto.Commune;
                branch.Phones = updateBranchDto.Phones;
                branch.Region = updateBranchDto.Department;
                branch.Email = updateBranchDto.Email;
                branch.OpeningDate = DateTime.TryParse(updateBranchDto.OpeningDate, out var openingDate) ? openingDate : branch.OpeningDate;
                branch.ManagerId = updateBranchDto.ManagerId;
                branch.MaxEmployees = updateBranchDto.MaxEmployees;
                branch.DailyWithdrawalLimit = updateBranchDto.Limits.DailyWithdrawalLimit;
                branch.DailyDepositLimit = updateBranchDto.Limits.DailyDepositLimit;
                branch.MaxLocalCreditApproval = updateBranchDto.Limits.MaxLocalCreditApproval;
                branch.MinCashReserveHTG = updateBranchDto.Limits.MinCashReserveHTG;
                branch.MinCashReserveUSD = updateBranchDto.Limits.MinCashReserveUSD;
                branch.OpenTime = TimeSpan.TryParse(updateBranchDto.OperatingHours.OpenTime, out var openTime) ? openTime : branch.OpenTime;
                branch.CloseTime = TimeSpan.TryParse(updateBranchDto.OperatingHours.CloseTime, out var closeTime) ? closeTime : branch.CloseTime;
                branch.ClosedDays = updateBranchDto.OperatingHours.ClosedDays ?? new List<int>();
                branch.IsActive = updateBranchDto.Status == "Active";
                branch.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(MapToBranchDto(branch));
            }
            catch (Exception ex)
            {
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
        public async Task<ActionResult<IEnumerable<BranchHistoryDto>>> GetBranchHistory(int branchId)
        {
            try
            {
                // For now, return empty list - will implement audit log later
                var history = new List<BranchHistoryDto>();
                return Ok(history);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Erreur lors du chargement de l'historique", error = ex.Message });
            }
        }

        private BranchDto MapToBranchDto(Branch branch)
        {
            try
            {
                // Safely format TimeSpan values
                string openTime = "08:00";
                string closeTime = "17:00";
                try
                {
                    openTime = branch.OpenTime.ToString(@"HH\:mm");
                    closeTime = branch.CloseTime.ToString(@"HH\:mm");
                }
                catch
                {
                    // Use defaults if TimeSpan formatting fails
                }

                // Safely format DateTime values
                string openingDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
                string createdAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
                string updatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
                try
                {
                    openingDate = branch.OpeningDate.ToString("yyyy-MM-dd");
                    createdAt = branch.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ");
                    updatedAt = branch.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ");
                }
                catch
                {
                    // Use defaults if DateTime formatting fails
                }

                return new BranchDto
                {
                    Id = branch.Id,
                    Name = branch.Name ?? "Unknown Branch",
                    Code = branch.Code ?? $"BR-{branch.Id:D3}",
                    Address = branch.Address ?? "Unknown Address",
                    Commune = branch.Commune ?? ExtractCommune(branch.Address ?? ""),
                    Department = branch.Region ?? "Unknown",
                    Phones = branch.Phones ?? new List<string>(),
                    Email = branch.Email ?? $"succursale{branch.Id}@nalacredit.com",
                    OpeningDate = openingDate,
                    ManagerId = branch.ManagerId,
                    ManagerName = branch.Manager != null ? $"{branch.Manager.FirstName ?? ""} {branch.Manager.LastName ?? ""}".Trim() : null,
                    MaxEmployees = branch.MaxEmployees,
                    Status = branch.IsActive ? "Active" : "Inactive",
                    Limits = new BranchLimitsDto
                    {
                        DailyWithdrawalLimit = branch.DailyWithdrawalLimit,
                        DailyDepositLimit = branch.DailyDepositLimit,
                        MaxLocalCreditApproval = branch.MaxLocalCreditApproval,
                        MinCashReserveHTG = branch.MinCashReserveHTG,
                        MinCashReserveUSD = branch.MinCashReserveUSD
                    },
                    OperatingHours = new OperatingHoursDto
                    {
                        OpenTime = openTime,
                        CloseTime = closeTime,
                        ClosedDays = branch.ClosedDays ?? new List<int> { 0 }
                    },
                    CreatedAt = createdAt,
                    UpdatedAt = updatedAt
                };
            }
            catch (Exception ex)
            {
                // Log the error and return a basic DTO
                Console.WriteLine($"Error mapping branch {branch?.Id}: {ex.Message}");
                Console.WriteLine($"Branch data: Name={branch?.Name}, Region={branch?.Region}");
                throw; // Re-throw to let the controller handle it
            }
        }

        private string ExtractCommune(string address)
        {
            // Simple extraction - in real app this would be more sophisticated
            return "Port-au-Prince";
        }

        private async Task<string> GenerateBranchCodeFromName(string name)
        {
            var words = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var code = string.Join("", words.Select(w => w.Substring(0, Math.Min(3, w.Length)).ToUpper()));
            
            // Ensure uniqueness
            var counter = 1;
            var baseCode = code;
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

                // Get today's transaction count
                var todayTransactions = await _context.Transactions
                    .Where(t => t.BranchId == branchId && t.CreatedAt.Date == today)
                    .CountAsync();

                // Get active cashiers count
                var totalCashiers = await _context.Users
                    .Where(u => u.BranchId == branchId && u.Role == UserRole.Cashier && u.IsActive)
                    .CountAsync();

                var activeCashiers = await _context.CashSessions
                    .Where(cs => cs.BranchId == branchId && cs.Status == CashSessionStatus.Open && cs.SessionStart.Date == today)
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
                    .Where(ca => ca.BranchId == branchId && ca.CreatedAt.Date == today)
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

                var activeSessions = await _context.CashSessions
                    .Include(cs => cs.User)
                    .Where(cs => cs.BranchId == branchId && cs.Status == CashSessionStatus.Open && cs.SessionStart.Date == today)
                    .Select(cs => new
                    {
                        cashier = $"{cs.User.FirstName} {cs.User.LastName}",
                        startTime = cs.SessionStart.ToString("HH:mm"),
                        transCount = _context.Transactions
                            .Count(t => t.UserId == cs.UserId && 
                                       t.CreatedAt.Date == today &&
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