using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using System.Security.Claims;
using System.Text.Json;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrocreditBorrowerController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MicrocreditBorrowerController> _logger;

        public MicrocreditBorrowerController(
            ApplicationDbContext context,
            ILogger<MicrocreditBorrowerController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Créer un nouvel emprunteur
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin,Manager,LoanOfficer")]
        public async Task<ActionResult<MicrocreditBorrowerDto>> CreateBorrower([FromBody] CreateMicrocreditBorrowerDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized("Utilisateur non identifié");
                }

                // Vérifier l'unicité du document d'identité
                var existingBorrower = await _context.MicrocreditBorrowers
                    .FirstOrDefaultAsync(b => b.Identity.Contains(dto.Identity.DocumentNumber));

                if (existingBorrower != null)
                {
                    return Conflict(new { message = "Un emprunteur avec ce numéro de document existe déjà" });
                }

                var borrower = new MicrocreditBorrower
                {
                    Id = Guid.NewGuid(),
                    FirstName = dto.FirstName,
                    LastName = dto.LastName,
                    DateOfBirth = dto.DateOfBirth,
                    Gender = dto.Gender,
                    Address = JsonSerializer.Serialize(dto.Address),
                    Contact = JsonSerializer.Serialize(dto.Contact),
                    Identity = JsonSerializer.Serialize(dto.Identity),
                    Occupation = dto.Occupation,
                    MonthlyIncome = dto.MonthlyIncome,
                    EmploymentType = dto.EmploymentType,
                    YearsInBusiness = dto.YearsInBusiness,
                    PreviousLoans = dto.PreviousLoans != null ? JsonSerializer.Serialize(dto.PreviousLoans) : null,
                    References = JsonSerializer.Serialize(dto.References),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Calculer le score de crédit initial
                borrower.CreditScore = await CalculateCreditScore(borrower);

                _context.MicrocreditBorrowers.Add(borrower);
                await _context.SaveChangesAsync();

                var borrowerDto = await MapToBorrowerDto(borrower);
                return CreatedAtAction(nameof(GetBorrower), new { id = borrower.Id }, borrowerDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating borrower");
                return StatusCode(500, "Erreur lors de la création de l'emprunteur");
            }
        }

        /// <summary>
        /// Obtenir un emprunteur par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<MicrocreditBorrowerDto>> GetBorrower(Guid id)
        {
            try
            {
                var borrower = await _context.MicrocreditBorrowers
                    .Include(b => b.LoanApplications)
                    .Include(b => b.Loans)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (borrower == null)
                {
                    return NotFound($"Emprunteur avec ID {id} non trouvé");
                }

                var borrowerDto = await MapToBorrowerDto(borrower);
                return Ok(borrowerDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving borrower {BorrowerId}", id);
                return StatusCode(500, "Erreur lors de la récupération de l'emprunteur");
            }
        }

        /// <summary>
        /// Obtenir la liste des emprunteurs avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<BorrowerListResponseDto>> GetBorrowers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? registrationFrom = null,
            [FromQuery] DateTime? registrationTo = null,
            [FromQuery] int? minCreditScore = null,
            [FromQuery] int? maxCreditScore = null,
            [FromQuery] string? sortBy = "CreatedAt",
            [FromQuery] string? sortOrder = "desc")
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 10;

                var query = _context.MicrocreditBorrowers.AsQueryable();

                // Recherche par terme
                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    query = query.Where(b =>
                        EF.Functions.Like(b.FirstName + " " + b.LastName, $"%{searchTerm}%") ||
                        EF.Functions.Like(b.Contact, $"%{searchTerm}%") ||
                        EF.Functions.Like(b.Identity, $"%{searchTerm}%"));
                }

                // Filtre par statut (actif/inactif basé sur les prêts récents)
                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (status.ToLower() == "active")
                    {
                        // Clients avec des prêts actifs ou des demandes récentes
                        var activeBorrowerIds = await _context.MicrocreditLoans
                            .Where(l => l.Status == MicrocreditLoanStatus.Active)
                            .Select(l => l.BorrowerId)
                            .Union(_context.MicrocreditLoanApplications
                                .Where(a => a.Status == MicrocreditApplicationStatus.Submitted ||
                                           a.Status == MicrocreditApplicationStatus.UnderReview ||
                                           a.Status == MicrocreditApplicationStatus.Approved)
                                .Select(a => a.BorrowerId))
                            .Distinct()
                            .ToListAsync();

                        query = query.Where(b => activeBorrowerIds.Contains(b.Id));
                    }
                    else if (status.ToLower() == "inactive")
                    {
                        // Clients sans activité récente
                        var activeBorrowerIds = await _context.MicrocreditLoans
                            .Where(l => l.Status == MicrocreditLoanStatus.Active)
                            .Select(l => l.BorrowerId)
                            .Union(_context.MicrocreditLoanApplications
                                .Where(a => a.Status == MicrocreditApplicationStatus.Submitted ||
                                           a.Status == MicrocreditApplicationStatus.UnderReview ||
                                           a.Status == MicrocreditApplicationStatus.Approved)
                                .Select(a => a.BorrowerId))
                            .Distinct()
                            .ToListAsync();

                        query = query.Where(b => !activeBorrowerIds.Contains(b.Id));
                    }
                }

                // Filtre par date d'inscription
                if (registrationFrom.HasValue)
                {
                    query = query.Where(b => b.CreatedAt >= registrationFrom.Value);
                }
                if (registrationTo.HasValue)
                {
                    query = query.Where(b => b.CreatedAt <= registrationTo.Value);
                }

                // Filtre par score de crédit
                if (minCreditScore.HasValue)
                {
                    query = query.Where(b => b.CreditScore >= minCreditScore.Value);
                }
                if (maxCreditScore.HasValue)
                {
                    query = query.Where(b => b.CreditScore <= maxCreditScore.Value);
                }

                // Tri
                query = sortBy?.ToLower() switch
                {
                    "name" => sortOrder?.ToLower() == "asc"
                        ? query.OrderBy(b => b.FirstName).ThenBy(b => b.LastName)
                        : query.OrderByDescending(b => b.FirstName).ThenByDescending(b => b.LastName),
                    "createdat" => sortOrder?.ToLower() == "asc"
                        ? query.OrderBy(b => b.CreatedAt)
                        : query.OrderByDescending(b => b.CreatedAt),
                    "creditscore" => sortOrder?.ToLower() == "asc"
                        ? query.OrderBy(b => b.CreditScore)
                        : query.OrderByDescending(b => b.CreditScore),
                    _ => sortOrder?.ToLower() == "asc"
                        ? query.OrderBy(b => b.CreatedAt)
                        : query.OrderByDescending(b => b.CreatedAt)
                };

                var totalCount = await query.CountAsync();
                var borrowers = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Include(b => b.LoanApplications)
                    .Include(b => b.Loans)
                    .ToListAsync();

                var borrowerDtos = new List<MicrocreditBorrowerDto>();
                foreach (var borrower in borrowers)
                {
                    borrowerDtos.Add(await MapToBorrowerDto(borrower));
                }

                var response = new BorrowerListResponseDto
                {
                    Borrowers = borrowerDtos,
                    TotalCount = totalCount,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                    CurrentPage = page,
                    PageSize = pageSize
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving borrowers");
                return StatusCode(500, "Erreur lors de la récupération des emprunteurs");
            }
        }

        /// <summary>
        /// Mettre à jour un emprunteur
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager,LoanOfficer")]
        public async Task<ActionResult<MicrocreditBorrowerDto>> UpdateBorrower(Guid id, [FromBody] UpdateMicrocreditBorrowerDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var borrower = await _context.MicrocreditBorrowers.FindAsync(id);
                if (borrower == null)
                {
                    return NotFound($"Emprunteur avec ID {id} non trouvé");
                }

                // Mettre à jour les champs
                borrower.FirstName = dto.FirstName ?? borrower.FirstName;
                borrower.LastName = dto.LastName ?? borrower.LastName;
                borrower.DateOfBirth = dto.DateOfBirth ?? borrower.DateOfBirth;
                borrower.Gender = dto.Gender ?? borrower.Gender;

                if (dto.Address != null)
                {
                    borrower.Address = JsonSerializer.Serialize(dto.Address);
                }

                if (dto.Contact != null)
                {
                    borrower.Contact = JsonSerializer.Serialize(dto.Contact);
                }

                if (dto.Identity != null)
                {
                    borrower.Identity = JsonSerializer.Serialize(dto.Identity);
                }

                borrower.Occupation = dto.Occupation ?? borrower.Occupation;
                borrower.MonthlyIncome = dto.MonthlyIncome ?? borrower.MonthlyIncome;
                borrower.EmploymentType = dto.EmploymentType ?? borrower.EmploymentType;
                borrower.YearsInBusiness = dto.YearsInBusiness ?? borrower.YearsInBusiness;

                if (dto.PreviousLoans != null)
                {
                    borrower.PreviousLoans = JsonSerializer.Serialize(dto.PreviousLoans);
                }

                if (dto.References != null)
                {
                    borrower.References = JsonSerializer.Serialize(dto.References);
                }

                borrower.UpdatedAt = DateTime.UtcNow;

                // Recalculer le score de crédit
                borrower.CreditScore = await CalculateCreditScore(borrower);

                await _context.SaveChangesAsync();

                var borrowerDto = await MapToBorrowerDto(borrower);
                return Ok(borrowerDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating borrower {BorrowerId}", id);
                return StatusCode(500, "Erreur lors de la mise à jour de l'emprunteur");
            }
        }

        /// <summary>
        /// Supprimer un emprunteur (soft delete si des prêts existent)
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> DeleteBorrower(Guid id)
        {
            try
            {
                var borrower = await _context.MicrocreditBorrowers
                    .Include(b => b.LoanApplications)
                    .Include(b => b.Loans)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (borrower == null)
                {
                    return NotFound($"Emprunteur avec ID {id} non trouvé");
                }

                // Vérifier s'il y a des prêts actifs
                var hasActiveLoans = borrower.Loans.Any(l => l.Status == MicrocreditLoanStatus.Active);
                if (hasActiveLoans)
                {
                    return BadRequest("Impossible de supprimer un emprunteur avec des prêts actifs");
                }

                // Soft delete - on pourrait ajouter un champ IsDeleted
                // Pour l'instant, on empêche la suppression
                return BadRequest("La suppression d'emprunteurs n'est pas autorisée. Contactez l'administrateur.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting borrower {BorrowerId}", id);
                return StatusCode(500, "Erreur lors de la suppression de l'emprunteur");
            }
        }

        /// <summary>
        /// Obtenir le profil complet d'un emprunteur
        /// </summary>
        [HttpGet("{id}/profile")]
        public async Task<ActionResult<BorrowerProfileDto>> GetBorrowerProfile(Guid id)
        {
            try
            {
                var borrower = await _context.MicrocreditBorrowers
                    .Include(b => b.LoanApplications)
                        .ThenInclude(a => a.Documents)
                    .Include(b => b.LoanApplications)
                        .ThenInclude(a => a.Guarantees)
                    .Include(b => b.LoanApplications)
                        .ThenInclude(a => a.ApprovalSteps)
                    .Include(b => b.Loans)
                        .ThenInclude(l => l.Payments)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (borrower == null)
                {
                    return NotFound($"Emprunteur avec ID {id} non trouvé");
                }

                var profile = new BorrowerProfileDto
                {
                    Borrower = await MapToBorrowerDto(borrower),
                    LoanApplications = borrower.LoanApplications.Select(a => new MicrocreditLoanApplicationDto
                    {
                        Id = a.Id,
                        ApplicationNumber = a.ApplicationNumber,
                        BorrowerId = a.BorrowerId,
                        LoanType = a.LoanType.ToString(),
                        RequestedAmount = a.RequestedAmount,
                        RequestedDurationMonths = a.RequestedDurationMonths,
                        Purpose = a.Purpose,
                        BusinessPlan = a.BusinessPlan,
                        Currency = a.Currency.ToString(),
                        BranchId = a.BranchId,
                        BranchName = a.BranchName,
                        MonthlyIncome = a.MonthlyIncome,
                        MonthlyExpenses = a.MonthlyExpenses,
                        ExistingDebts = a.ExistingDebts,
                        CollateralValue = a.CollateralValue,
                        DebtToIncomeRatio = a.DebtToIncomeRatio,
                        Status = a.Status.ToString(),
                        SubmittedAt = a.SubmittedAt,
                        ReviewedAt = a.ReviewedAt,
                        ApprovedAt = a.ApprovedAt,
                        RejectedAt = a.RejectedAt,
                        RejectionReason = a.RejectionReason,
                        CreatedAt = a.CreatedAt,
                        UpdatedAt = a.UpdatedAt,
                        LoanOfficerId = a.LoanOfficerId,
                        LoanOfficerName = a.LoanOfficerName,
                        Documents = a.Documents.Select(d => new MicrocreditApplicationDocumentDto
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
                        }).ToList(),
                        Guarantees = a.Guarantees.Select(g => new MicrocreditGuaranteeDto
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
                        }).ToList()
                    }).ToList(),
                    ActiveLoans = borrower.Loans
                        .Where(l => l.Status == MicrocreditLoanStatus.Active)
                        .Select(l => new MicrocreditLoanDto
                        {
                            Id = l.Id,
                            LoanNumber = l.LoanNumber,
                            ApplicationId = l.ApplicationId,
                            BorrowerId = l.BorrowerId,
                            LoanType = l.LoanType.ToString(),
                            PrincipalAmount = l.PrincipalAmount,
                            InterestRate = l.InterestRate,
                            DurationMonths = l.DurationMonths,
                            InstallmentAmount = l.InstallmentAmount,
                            Currency = l.Currency.ToString(),
                            DisbursementDate = l.DisbursementDate,
                            FirstInstallmentDate = l.FirstInstallmentDate,
                            MaturityDate = l.MaturityDate,
                            TotalAmountDue = l.TotalAmountDue,
                            AmountPaid = l.AmountPaid,
                            PrincipalPaid = l.PrincipalPaid,
                            InterestPaid = l.InterestPaid,
                            PenaltiesPaid = l.PenaltiesPaid,
                            OutstandingBalance = l.OutstandingBalance,
                            OutstandingPrincipal = l.OutstandingPrincipal,
                            OutstandingInterest = l.OutstandingInterest,
                            OutstandingPenalties = l.OutstandingPenalties,
                            Status = l.Status.ToString(),
                            InstallmentsPaid = l.InstallmentsPaid,
                            InstallmentsRemaining = l.InstallmentsRemaining,
                            DaysOverdue = l.DaysOverdue,
                            BranchId = l.BranchId,
                            BranchName = l.BranchName,
                            LoanOfficerId = l.LoanOfficerId,
                            LoanOfficerName = l.LoanOfficerName,
                            CreatedAt = l.CreatedAt,
                            UpdatedAt = l.UpdatedAt,
                            LastPaymentDate = l.LastPaymentDate,
                            NextPaymentDue = l.NextPaymentDue
                        }).ToList(),
                    LoanHistory = borrower.Loans
                        .Where(l => l.Status != MicrocreditLoanStatus.Active)
                        .Select(l => new LoanHistoryDto
                        {
                            LoanId = l.Id,
                            LoanNumber = l.LoanNumber,
                            LoanType = l.LoanType.ToString(),
                            PrincipalAmount = l.PrincipalAmount,
                            Status = l.Status.ToString(),
                            DisbursementDate = l.DisbursementDate,
                            CompletionDate = l.Status == MicrocreditLoanStatus.Completed ? l.UpdatedAt : null,
                            TotalPaid = l.AmountPaid,
                            OutstandingBalance = l.OutstandingBalance
                        }).ToList(),
                    PaymentHistory = borrower.Loans
                        .SelectMany(l => l.Payments)
                        .OrderByDescending(p => p.PaymentDate)
                        .Take(50) // Derniers 50 paiements
                        .Select(p => new MicrocreditPaymentDto
                        {
                            Id = p.Id,
                            PaymentNumber = p.PaymentNumber,
                            Amount = p.Amount,
                            PrincipalAmount = p.PrincipalAmount,
                            InterestAmount = p.InterestAmount,
                            PenaltyAmount = p.PenaltyAmount,
                            Currency = p.Currency.ToString(),
                            PaymentDate = p.PaymentDate,
                            ValueDate = p.ValueDate,
                            Status = p.Status.ToString(),
                            PaymentMethod = p.PaymentMethod.ToString(),
                            Reference = p.Reference,
                            ProcessedBy = p.ProcessedBy,
                            ProcessedByName = p.ProcessedByName,
                            BranchId = p.BranchId,
                            BranchName = p.BranchName,
                            ReceiptNumber = p.ReceiptNumber,
                            ReceiptPath = p.ReceiptPath,
                            Notes = p.Notes,
                            CreatedAt = p.CreatedAt,
                            UpdatedAt = p.UpdatedAt
                        }).ToList(),
                    RiskAssessment = await CalculateRiskAssessment(borrower),
                    Statistics = await CalculateBorrowerStatistics(borrower)
                };

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving borrower profile {BorrowerId}", id);
                return StatusCode(500, "Erreur lors de la récupération du profil");
            }
        }

        /// <summary>
        /// Calculer le score de crédit d'un emprunteur
        /// </summary>
        [HttpPost("{id}/calculate-credit-score")]
        [Authorize(Roles = "Admin,Manager,LoanOfficer")]
        public async Task<ActionResult<CreditScoreDto>> CalculateCreditScore(Guid id)
        {
            try
            {
                var borrower = await _context.MicrocreditBorrowers.FindAsync(id);
                if (borrower == null)
                {
                    return NotFound($"Emprunteur avec ID {id} non trouvé");
                }

                var score = await CalculateCreditScore(borrower);
                borrower.CreditScore = score;
                borrower.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                var creditScoreDto = new CreditScoreDto
                {
                    BorrowerId = id,
                    Score = score,
                    Level = GetCreditScoreLevel(score),
                    Factors = await GetCreditScoreFactors(borrower),
                    CalculatedAt = DateTime.UtcNow
                };

                return Ok(creditScoreDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating credit score for borrower {BorrowerId}", id);
                return StatusCode(500, "Erreur lors du calcul du score de crédit");
            }
        }

        /// <summary>
        /// Obtenir la segmentation des clients
        /// </summary>
        [HttpGet("segmentation")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<ClientSegmentationDto>> GetClientSegmentation()
        {
            try
            {
                var borrowers = await _context.MicrocreditBorrowers
                    .Include(b => b.Loans)
                    .Include(b => b.LoanApplications)
                    .ToListAsync();

                var segmentation = new ClientSegmentationDto
                {
                    TotalClients = borrowers.Count,
                    ActiveClients = new ClientSegmentDto
                    {
                        Count = borrowers.Count(b => HasActiveLoans(b) || HasRecentApplications(b)),
                        Percentage = 0,
                        Clients = borrowers.Where(b => HasActiveLoans(b) || HasRecentApplications(b))
                            .Select(b => new ClientSummaryDto
                            {
                                Id = b.Id,
                                FullName = b.FullName,
                                CreditScore = b.CreditScore,
                                TotalLoans = b.Loans.Count,
                                ActiveLoans = b.Loans.Count(l => l.Status == MicrocreditLoanStatus.Active),
                                TotalOutstanding = b.Loans.Where(l => l.Status == MicrocreditLoanStatus.Active)
                                    .Sum(l => l.OutstandingBalance)
                            }).ToList()
                    },
                    InactiveClients = new ClientSegmentDto
                    {
                        Count = borrowers.Count(b => !HasActiveLoans(b) && !HasRecentApplications(b)),
                        Percentage = 0,
                        Clients = borrowers.Where(b => !HasActiveLoans(b) && !HasRecentApplications(b))
                            .Select(b => new ClientSummaryDto
                            {
                                Id = b.Id,
                                FullName = b.FullName,
                                CreditScore = b.CreditScore,
                                TotalLoans = b.Loans.Count,
                                ActiveLoans = 0,
                                TotalOutstanding = 0
                            }).ToList()
                    },
                    AtRiskClients = new ClientSegmentDto
                    {
                        Count = borrowers.Count(b => HasOverdueLoans(b)),
                        Percentage = 0,
                        Clients = borrowers.Where(b => HasOverdueLoans(b))
                            .Select(b => new ClientSummaryDto
                            {
                                Id = b.Id,
                                FullName = b.FullName,
                                CreditScore = b.CreditScore,
                                TotalLoans = b.Loans.Count,
                                ActiveLoans = b.Loans.Count(l => l.Status == MicrocreditLoanStatus.Active),
                                TotalOutstanding = b.Loans.Where(l => l.Status == MicrocreditLoanStatus.Active)
                                    .Sum(l => l.OutstandingBalance)
                            }).ToList()
                    },
                    HighScoreClients = new ClientSegmentDto
                    {
                        Count = borrowers.Count(b => (b.CreditScore ?? 0) >= 750),
                        Percentage = 0,
                        Clients = borrowers.Where(b => (b.CreditScore ?? 0) >= 750)
                            .Select(b => new ClientSummaryDto
                            {
                                Id = b.Id,
                                FullName = b.FullName,
                                CreditScore = b.CreditScore,
                                TotalLoans = b.Loans.Count,
                                ActiveLoans = b.Loans.Count(l => l.Status == MicrocreditLoanStatus.Active),
                                TotalOutstanding = b.Loans.Where(l => l.Status == MicrocreditLoanStatus.Active)
                                    .Sum(l => l.OutstandingBalance)
                            }).ToList()
                    },
                    NewClients = new ClientSegmentDto
                    {
                        Count = borrowers.Count(b => b.CreatedAt >= DateTime.UtcNow.AddMonths(-3)),
                        Percentage = 0,
                        Clients = borrowers.Where(b => b.CreatedAt >= DateTime.UtcNow.AddMonths(-3))
                            .Select(b => new ClientSummaryDto
                            {
                                Id = b.Id,
                                FullName = b.FullName,
                                CreditScore = b.CreditScore,
                                TotalLoans = b.Loans.Count,
                                ActiveLoans = b.Loans.Count(l => l.Status == MicrocreditLoanStatus.Active),
                                TotalOutstanding = b.Loans.Where(l => l.Status == MicrocreditLoanStatus.Active)
                                    .Sum(l => l.OutstandingBalance)
                            }).ToList()
                    }
                };

                // Calculer les pourcentages
                if (segmentation.TotalClients > 0)
                {
                    segmentation.ActiveClients.Percentage = (decimal)segmentation.ActiveClients.Count / segmentation.TotalClients * 100;
                    segmentation.InactiveClients.Percentage = (decimal)segmentation.InactiveClients.Count / segmentation.TotalClients * 100;
                    segmentation.AtRiskClients.Percentage = (decimal)segmentation.AtRiskClients.Count / segmentation.TotalClients * 100;
                    segmentation.HighScoreClients.Percentage = (decimal)segmentation.HighScoreClients.Count / segmentation.TotalClients * 100;
                    segmentation.NewClients.Percentage = (decimal)segmentation.NewClients.Count / segmentation.TotalClients * 100;
                }

                return Ok(segmentation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving client segmentation");
                return StatusCode(500, "Erreur lors de la récupération de la segmentation");
            }
        }

        // Méthodes privées d'aide
        private async Task<MicrocreditBorrowerDto> MapToBorrowerDto(MicrocreditBorrower borrower)
        {
            return new MicrocreditBorrowerDto
            {
                Id = borrower.Id,
                FirstName = borrower.FirstName,
                LastName = borrower.LastName,
                FullName = borrower.FullName,
                DateOfBirth = borrower.DateOfBirth,
                Gender = borrower.Gender,
                Address = JsonSerializer.Deserialize<BorrowerAddressDto>(borrower.Address)!,
                Contact = JsonSerializer.Deserialize<BorrowerContactDto>(borrower.Contact)!,
                Identity = JsonSerializer.Deserialize<BorrowerIdentityDto>(borrower.Identity)!,
                Occupation = borrower.Occupation,
                MonthlyIncome = borrower.MonthlyIncome,
                EmploymentType = borrower.EmploymentType,
                YearsInBusiness = borrower.YearsInBusiness,
                CreditScore = borrower.CreditScore,
                PreviousLoans = borrower.PreviousLoans != null ?
                    JsonSerializer.Deserialize<List<PreviousLoanDto>>(borrower.PreviousLoans) : null,
                References = JsonSerializer.Deserialize<List<ReferenceDto>>(borrower.References)!,
                CreatedAt = borrower.CreatedAt,
                UpdatedAt = borrower.UpdatedAt
            };
        }

        private async Task<int> CalculateCreditScore(MicrocreditBorrower borrower)
        {
            int score = 500; // Score de base

            // Facteur âge (18-65 ans = bon)
            var age = DateTime.Now.Year - borrower.DateOfBirth.Year;
            if (age >= 25 && age <= 55) score += 50;
            else if (age >= 18 && age <= 65) score += 25;

            // Facteur revenu mensuel
            if (borrower.MonthlyIncome >= 50000) score += 50;      // Très bon revenu
            else if (borrower.MonthlyIncome >= 25000) score += 30; // Bon revenu
            else if (borrower.MonthlyIncome >= 15000) score += 15; // Revenu acceptable

            // Facteur ancienneté dans les affaires
            if (borrower.YearsInBusiness >= 5) score += 40;
            else if (borrower.YearsInBusiness >= 2) score += 20;
            else if (borrower.YearsInBusiness >= 1) score += 10;

            // Facteur historique des prêts
            var completedLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Completed);
            var overdueLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Overdue || l.Status == MicrocreditLoanStatus.Defaulted);

            if (completedLoans >= 3) score += 30;
            else if (completedLoans >= 1) score += 15;

            if (overdueLoans == 0) score += 20;
            else if (overdueLoans <= 2) score -= 10;
            else score -= 30;

            // Limiter le score entre 300 et 900
            return Math.Max(300, Math.Min(900, score));
        }

        private string GetCreditScoreLevel(int score)
        {
            if (score >= 750) return "Excellent";
            if (score >= 650) return "Bon";
            if (score >= 550) return "Acceptable";
            if (score >= 450) return "Risqué";
            return "Très Risqué";
        }

        private async Task<List<CreditScoreFactorDto>> GetCreditScoreFactors(MicrocreditBorrower borrower)
        {
            var factors = new List<CreditScoreFactorDto>();

            // Facteur âge
            var age = DateTime.Now.Year - borrower.DateOfBirth.Year;
            factors.Add(new CreditScoreFactorDto
            {
                Factor = "Âge",
                Score = age >= 25 && age <= 55 ? 50 : age >= 18 && age <= 65 ? 25 : 0,
                Description = $"Âge: {age} ans"
            });

            // Facteur revenu
            var incomeScore = 0;
            if (borrower.MonthlyIncome >= 50000) incomeScore = 50;
            else if (borrower.MonthlyIncome >= 25000) incomeScore = 30;
            else if (borrower.MonthlyIncome >= 15000) incomeScore = 15;

            factors.Add(new CreditScoreFactorDto
            {
                Factor = "Revenu Mensuel",
                Score = incomeScore,
                Description = $"Revenu: {borrower.MonthlyIncome:N0} HTG"
            });

            // Facteur ancienneté
            var businessScore = 0;
            if (borrower.YearsInBusiness >= 5) businessScore = 40;
            else if (borrower.YearsInBusiness >= 2) businessScore = 20;
            else if (borrower.YearsInBusiness >= 1) businessScore = 10;

            factors.Add(new CreditScoreFactorDto
            {
                Factor = "Ancienneté Affaires",
                Score = businessScore,
                Description = $"{borrower.YearsInBusiness ?? 0} années"
            });

            // Facteur historique des prêts
            var completedLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Completed);
            var overdueLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Overdue || l.Status == MicrocreditLoanStatus.Defaulted);

            var loanHistoryScore = 0;
            if (completedLoans >= 3) loanHistoryScore = 30;
            else if (completedLoans >= 1) loanHistoryScore = 15;

            if (overdueLoans == 0) loanHistoryScore += 20;
            else if (overdueLoans <= 2) loanHistoryScore -= 10;
            else loanHistoryScore -= 30;

            factors.Add(new CreditScoreFactorDto
            {
                Factor = "Historique Prêts",
                Score = loanHistoryScore,
                Description = $"{completedLoans} prêts complétés, {overdueLoans} en retard"
            });

            return factors;
        }

        private async Task<RiskAssessmentDto> CalculateRiskAssessment(MicrocreditBorrower borrower)
        {
            var assessment = new RiskAssessmentDto
            {
                Score = borrower.CreditScore ?? 500,
                Level = GetCreditScoreLevel(borrower.CreditScore ?? 500),
                Factors = new List<RiskFactorDto>(),
                AssessedAt = DateTime.UtcNow,
                AssessedBy = "Système"
            };

            // Facteurs de risque
            var age = DateTime.Now.Year - borrower.DateOfBirth.Year;
            if (age < 21 || age > 65)
            {
                assessment.Factors.Add(new RiskFactorDto
                {
                    Factor = "Âge",
                    Impact = "Élevé",
                    Weight = 0.2m,
                    Description = $"Âge {age} ans - hors de la tranche optimale 21-65 ans"
                });
            }

            if (borrower.MonthlyIncome < 10000)
            {
                assessment.Factors.Add(new RiskFactorDto
                {
                    Factor = "Revenu Faible",
                    Impact = "Élevé",
                    Weight = 0.3m,
                    Description = $"Revenu mensuel {borrower.MonthlyIncome:N0} HTG - insuffisant"
                });
            }

            var overdueLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Overdue);
            if (overdueLoans > 0)
            {
                assessment.Factors.Add(new RiskFactorDto
                {
                    Factor = "Historique Retards",
                    Impact = "Élevé",
                    Weight = 0.25m,
                    Description = $"{overdueLoans} prêts en retard - historique de paiement préoccupant"
                });
            }

            var activeLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Active);
            if (activeLoans >= 2)
            {
                assessment.Factors.Add(new RiskFactorDto
                {
                    Factor = "Multiples Prêts Actifs",
                    Impact = "Moyen",
                    Weight = 0.15m,
                    Description = $"{activeLoans} prêts actifs - capacité de remboursement réduite"
                });
            }

            // Recommandation
            if (assessment.Score >= 750)
                assessment.Recommendation = "Client excellent - approuver sans réserve";
            else if (assessment.Score >= 650)
                assessment.Recommendation = "Bon client - approuver avec conditions normales";
            else if (assessment.Score >= 550)
                assessment.Recommendation = "Client acceptable - approuver avec garanties supplémentaires";
            else if (assessment.Score >= 450)
                assessment.Recommendation = "Client risqué - approuver uniquement avec garanties solides";
            else
                assessment.Recommendation = "Client très risqué - rejeter ou exiger garanties exceptionnelles";

            return assessment;
        }

        private async Task<BorrowerStatisticsDto> CalculateBorrowerStatistics(MicrocreditBorrower borrower)
        {
            var stats = new BorrowerStatisticsDto
            {
                TotalLoans = borrower.Loans.Count,
                ActiveLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Active),
                CompletedLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Completed),
                OverdueLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Overdue),
                DefaultedLoans = borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Defaulted),
                TotalBorrowed = borrower.Loans.Sum(l => l.PrincipalAmount),
                TotalPaid = borrower.Loans.Sum(l => l.AmountPaid),
                TotalOutstanding = borrower.Loans.Where(l => l.Status == MicrocreditLoanStatus.Active)
                    .Sum(l => l.OutstandingBalance),
                AverageLoanAmount = borrower.Loans.Any() ? borrower.Loans.Average(l => l.PrincipalAmount) : 0,
                OnTimePaymentRate = borrower.Loans.Any() ?
                    (decimal)borrower.Loans.Count(l => l.Status == MicrocreditLoanStatus.Completed) / borrower.Loans.Count * 100 : 0,
                LastLoanDate = borrower.Loans.Max(l => (DateTime?)l.CreatedAt),
                MemberSince = borrower.CreatedAt
            };

            return stats;
        }

        private bool HasActiveLoans(MicrocreditBorrower borrower)
        {
            return borrower.Loans.Any(l => l.Status == MicrocreditLoanStatus.Active);
        }

        private bool HasRecentApplications(MicrocreditBorrower borrower)
        {
            return borrower.LoanApplications.Any(a =>
                a.CreatedAt >= DateTime.UtcNow.AddMonths(-6) &&
                (a.Status == MicrocreditApplicationStatus.Submitted ||
                 a.Status == MicrocreditApplicationStatus.UnderReview ||
                 a.Status == MicrocreditApplicationStatus.Approved));
        }

        private bool HasOverdueLoans(MicrocreditBorrower borrower)
        {
            return borrower.Loans.Any(l => l.Status == MicrocreditLoanStatus.Overdue || l.DaysOverdue > 0);
        }
    }

    // DTOs supplémentaires pour le contrôleur
    public class BorrowerListResponseDto
    {
        public List<MicrocreditBorrowerDto> Borrowers { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int CurrentPage { get; set; }
        public int PageSize { get; set; }
    }

    public class BorrowerProfileDto
    {
        public MicrocreditBorrowerDto Borrower { get; set; } = new();
        public List<MicrocreditLoanApplicationDto> LoanApplications { get; set; } = new();
        public List<MicrocreditLoanDto> ActiveLoans { get; set; } = new();
        public List<LoanHistoryDto> LoanHistory { get; set; } = new();
        public List<MicrocreditPaymentDto> PaymentHistory { get; set; } = new();
        public RiskAssessmentDto RiskAssessment { get; set; } = new();
        public BorrowerStatisticsDto Statistics { get; set; } = new();
    }

    public class LoanHistoryDto
    {
        public Guid LoanId { get; set; }
        public string LoanNumber { get; set; } = string.Empty;
        public string LoanType { get; set; } = string.Empty;
        public decimal PrincipalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateOnly DisbursementDate { get; set; }
        public DateTime? CompletionDate { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal OutstandingBalance { get; set; }
    }

    public class BorrowerStatisticsDto
    {
        public int TotalLoans { get; set; }
        public int ActiveLoans { get; set; }
        public int CompletedLoans { get; set; }
        public int OverdueLoans { get; set; }
        public int DefaultedLoans { get; set; }
        public decimal TotalBorrowed { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalOutstanding { get; set; }
        public decimal AverageLoanAmount { get; set; }
        public decimal OnTimePaymentRate { get; set; }
        public DateTime? LastLoanDate { get; set; }
        public DateTime MemberSince { get; set; }
    }

    public class CreditScoreDto
    {
        public Guid BorrowerId { get; set; }
        public int Score { get; set; }
        public string Level { get; set; } = string.Empty;
        public List<CreditScoreFactorDto> Factors { get; set; } = new();
        public DateTime CalculatedAt { get; set; }
    }

    public class CreditScoreFactorDto
    {
        public string Factor { get; set; } = string.Empty;
        public int Score { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class ClientSegmentationDto
    {
        public int TotalClients { get; set; }
        public ClientSegmentDto ActiveClients { get; set; } = new();
        public ClientSegmentDto InactiveClients { get; set; } = new();
        public ClientSegmentDto AtRiskClients { get; set; } = new();
        public ClientSegmentDto HighScoreClients { get; set; } = new();
        public ClientSegmentDto NewClients { get; set; } = new();
    }

    public class ClientSegmentDto
    {
        public int Count { get; set; }
        public decimal Percentage { get; set; }
        public List<ClientSummaryDto> Clients { get; set; } = new();
    }

    public class ClientSummaryDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public int? CreditScore { get; set; }
        public int TotalLoans { get; set; }
        public int ActiveLoans { get; set; }
        public decimal TotalOutstanding { get; set; }
    }

    public class UpdateMicrocreditBorrowerDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public BorrowerAddressDto? Address { get; set; }
        public BorrowerContactDto? Contact { get; set; }
        public BorrowerIdentityDto? Identity { get; set; }
        public string? Occupation { get; set; }
        public decimal? MonthlyIncome { get; set; }
        public string? EmploymentType { get; set; }
        public int? YearsInBusiness { get; set; }
        public List<PreviousLoanDto>? PreviousLoans { get; set; }
        public List<ReferenceDto>? References { get; set; }
    }
}