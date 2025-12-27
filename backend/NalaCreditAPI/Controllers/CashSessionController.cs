using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

/// <summary>
/// Controller pour la gestion des sessions de caisse
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CashSessionController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CashSessionController> _logger;

    public CashSessionController(ApplicationDbContext context, ILogger<CashSessionController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Obtenir toutes les sessions de caisse pour une succursale avec filtres optionnels
    /// GET /api/cashsession/branch/{branchId}
    /// </summary>
    [HttpGet("branch/{branchId}")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> GetBranchCashSessions(
        int branchId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] CashSessionStatus? status = null,
        [FromQuery] string? cashierId = null)
    {
        try
        {
            var query = _context.CashSessions
                .Include(cs => cs.User)
                .Where(cs => cs.BranchId == branchId)
                .AsQueryable();

            // Filtres optionnels
            if (startDate.HasValue)
            {
                query = query.Where(cs => cs.SessionStart.Date >= startDate.Value.Date);
            }

            if (endDate.HasValue)
            {
                query = query.Where(cs => cs.SessionStart.Date <= endDate.Value.Date);
            }

            if (status.HasValue)
            {
                query = query.Where(cs => cs.Status == status.Value);
            }

            if (!string.IsNullOrEmpty(cashierId))
            {
                query = query.Where(cs => cs.UserId == cashierId);
            }

            var sessions = await query
                .OrderByDescending(cs => cs.SessionStart)
                .Select(cs => new
                {
                    cs.Id,
                    cs.UserId,
                    CashierName = $"{cs.User.FirstName} {cs.User.LastName}",
                    cs.OpeningBalanceHTG,
                    cs.OpeningBalanceUSD,
                    cs.ClosingBalanceHTG,
                    cs.ClosingBalanceUSD,
                    cs.SessionStart,
                    cs.SessionEnd,
                    cs.Status,
                    cs.Notes,
                    TransactionCount = _context.Transactions
                        .Count(t => t.CashSessionId == cs.Id),
                    TotalAmountHTG = _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id && t.Currency == Currency.HTG)
                        .Sum(t => (decimal?)t.Amount) ?? 0,
                    TotalAmountUSD = _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id && t.Currency == Currency.USD)
                        .Sum(t => (decimal?)t.Amount) ?? 0,
                    VarianceHTG = cs.Status == CashSessionStatus.Closed 
                        ? (cs.ClosingBalanceHTG ?? 0) - cs.OpeningBalanceHTG
                        : (decimal?)null,
                    VarianceUSD = cs.Status == CashSessionStatus.Closed
                        ? (cs.ClosingBalanceUSD ?? 0) - cs.OpeningBalanceUSD
                        : (decimal?)null
                })
                .ToListAsync();

            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching cash sessions for branch {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors du chargement des sessions de caisse", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir les sessions de caisse actives (ouvertes) pour une succursale
    /// GET /api/cashsession/branch/{branchId}/active
    /// </summary>
    [HttpGet("branch/{branchId}/active")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> GetActiveCashSessions(int branchId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var activeSessions = await _context.CashSessions
                .Include(cs => cs.User)
                .Where(cs => cs.BranchId == branchId && 
                            cs.Status == CashSessionStatus.Open && 
                            cs.SessionStart.Date == today)
                .ToListAsync();

            var sessionResults = new List<object>();

            foreach (var cs in activeSessions)
            {
                // Count transactions from Transaction table
                var transactionCount = await _context.Transactions
                    .CountAsync(t => t.CashSessionId == cs.Id);

                // Deposits from multiple sources
                var depositsHTG = 
                    await _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id && 
                                   t.Currency == Currency.HTG && 
                                   t.Type == TransactionType.Deposit)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                depositsHTG += 
                    await _context.SavingsTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == SavingsCurrency.HTG && 
                                   t.Type == SavingsTransactionType.Deposit &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                depositsHTG += 
                    await _context.CurrentAccountTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == ClientCurrency.HTG && 
                                   t.Type == SavingsTransactionType.Deposit &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;

                var depositsUSD = 
                    await _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id && 
                                   t.Currency == Currency.USD && 
                                   t.Type == TransactionType.Deposit)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                depositsUSD += 
                    await _context.SavingsTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == SavingsCurrency.USD && 
                                   t.Type == SavingsTransactionType.Deposit &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                depositsUSD += 
                    await _context.CurrentAccountTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == ClientCurrency.USD && 
                                   t.Type == SavingsTransactionType.Deposit &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;

                // Withdrawals from multiple sources
                var withdrawalsHTG = 
                    await _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id && 
                                   t.Currency == Currency.HTG && 
                                   t.Type == TransactionType.Withdrawal)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                withdrawalsHTG += 
                    await _context.SavingsTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == SavingsCurrency.HTG && 
                                   t.Type == SavingsTransactionType.Withdrawal &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                withdrawalsHTG += 
                    await _context.CurrentAccountTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == ClientCurrency.HTG && 
                                   t.Type == SavingsTransactionType.Withdrawal &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;

                var withdrawalsUSD = 
                    await _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id && 
                                   t.Currency == Currency.USD && 
                                   t.Type == TransactionType.Withdrawal)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                withdrawalsUSD += 
                    await _context.SavingsTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == SavingsCurrency.USD && 
                                   t.Type == SavingsTransactionType.Withdrawal &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;
                
                withdrawalsUSD += 
                    await _context.CurrentAccountTransactions
                        .Where(t => t.ProcessedBy == cs.UserId && 
                                   t.Currency == ClientCurrency.USD && 
                                   t.Type == SavingsTransactionType.Withdrawal &&
                                   t.ProcessedAt >= today && t.ProcessedAt < tomorrow)
                        .SumAsync(t => (decimal?)t.Amount) ?? 0;

                // Exchanges
                var exchangeHTGIn = 
                    await _context.ExchangeTransactions
                        .Where(et => et.ProcessedBy == cs.UserId && 
                                    et.FromCurrency == CurrencyType.USD &&
                                    et.CreatedAt >= today && et.CreatedAt < tomorrow)
                        .SumAsync(et => (decimal?)et.ToAmount) ?? 0;

                var exchangeHTGOut = 
                    await _context.ExchangeTransactions
                        .Where(et => et.ProcessedBy == cs.UserId && 
                                    et.FromCurrency == CurrencyType.HTG &&
                                    et.CreatedAt >= today && et.CreatedAt < tomorrow)
                        .SumAsync(et => (decimal?)et.FromAmount) ?? 0;

                var exchangeUSDIn = 
                    await _context.ExchangeTransactions
                        .Where(et => et.ProcessedBy == cs.UserId && 
                                    et.FromCurrency == CurrencyType.HTG &&
                                    et.CreatedAt >= today && et.CreatedAt < tomorrow)
                        .SumAsync(et => (decimal?)et.ToAmount) ?? 0;

                var exchangeUSDOut = 
                    await _context.ExchangeTransactions
                        .Where(et => et.ProcessedBy == cs.UserId && 
                                    et.FromCurrency == CurrencyType.USD &&
                                    et.CreatedAt >= today && et.CreatedAt < tomorrow)
                        .SumAsync(et => (decimal?)et.FromAmount) ?? 0;

                // Recoveries (credit payments)
                var recoveriesHTG = 
                    await _context.MicrocreditPayments
                        .Where(p => p.ProcessedBy == cs.UserId && 
                                   p.Currency == MicrocreditCurrency.HTG &&
                                   p.PaymentDate == DateOnly.FromDateTime(today))
                        .SumAsync(p => (decimal?)p.Amount) ?? 0;

                var recoveriesUSD = 
                    await _context.MicrocreditPayments
                        .Where(p => p.ProcessedBy == cs.UserId && 
                                   p.Currency == MicrocreditCurrency.USD &&
                                   p.PaymentDate == DateOnly.FromDateTime(today))
                        .SumAsync(p => (decimal?)p.Amount) ?? 0;

                // Calculate current balance
                var currentBalanceHTG = cs.OpeningBalanceHTG + depositsHTG - withdrawalsHTG + exchangeHTGIn - exchangeHTGOut + recoveriesHTG;
                var currentBalanceUSD = cs.OpeningBalanceUSD + depositsUSD - withdrawalsUSD + exchangeUSDIn - exchangeUSDOut + recoveriesUSD;

                sessionResults.Add(new
                {
                    cs.Id,
                    cs.UserId,
                    CashierName = $"{cs.User.FirstName} {cs.User.LastName}",
                    cs.OpeningBalanceHTG,
                    cs.OpeningBalanceUSD,
                    cs.SessionStart,
                    DurationMinutes = (int)(DateTime.UtcNow - cs.SessionStart).TotalMinutes,
                    TransactionCount = transactionCount,
                    TotalDepositHTG = depositsHTG,
                    TotalDepositUSD = depositsUSD,
                    TotalWithdrawalHTG = withdrawalsHTG,
                    TotalWithdrawalUSD = withdrawalsUSD,
                    ExchangeHTGIn = exchangeHTGIn,
                    ExchangeHTGOut = exchangeHTGOut,
                    ExchangeUSDIn = exchangeUSDIn,
                    ExchangeUSDOut = exchangeUSDOut,
                    RecoveriesHTG = recoveriesHTG,
                    RecoveriesUSD = recoveriesUSD,
                    CurrentBalanceHTG = currentBalanceHTG,
                    CurrentBalanceUSD = currentBalanceUSD
                });
            }

            return Ok(sessionResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching active cash sessions for branch {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors du chargement des sessions actives", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir les détails d'une session de caisse spécifique avec ses transactions
    /// GET /api/cashsession/{sessionId}
    /// </summary>
    [HttpGet("{sessionId}")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin,Cashier")]
    public async Task<ActionResult> GetCashSessionDetails(int sessionId)
    {
        try
        {
            var session = await _context.CashSessions
                .Include(cs => cs.User)
                .Include(cs => cs.Branch)
                .FirstOrDefaultAsync(cs => cs.Id == sessionId);

            if (session == null)
            {
                return NotFound(new { message = "Session de caisse non trouvée" });
            }

            var transactions = await _context.Transactions
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .Where(t => t.CashSessionId == sessionId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    t.TransactionNumber,
                    t.Type,
                    t.Currency,
                    t.Amount,
                    t.BalanceAfter,
                    t.Description,
                    t.CreatedAt,
                    t.Status,
                    CustomerName = t.Account != null && t.Account.Customer != null
                        ? $"{t.Account.Customer.FirstName} {t.Account.Customer.LastName}"
                        : "N/A",
                    AccountNumber = t.Account != null ? t.Account.AccountNumber : null
                })
                .ToListAsync();

            var result = new
            {
                session.Id,
                session.UserId,
                CashierName = $"{session.User.FirstName} {session.User.LastName}",
                BranchName = session.Branch.Name,
                session.OpeningBalanceHTG,
                session.OpeningBalanceUSD,
                session.ClosingBalanceHTG,
                session.ClosingBalanceUSD,
                session.SessionStart,
                session.SessionEnd,
                session.Status,
                session.Notes,
                DurationMinutes = session.SessionEnd.HasValue
                    ? (int)(session.SessionEnd.Value - session.SessionStart).TotalMinutes
                    : (int)(DateTime.UtcNow - session.SessionStart).TotalMinutes,
                TransactionCount = transactions.Count,
                Transactions = transactions,
                Summary = new
                {
                    TotalDepositHTG = transactions
                        .Where(t => t.Type == TransactionType.Deposit && t.Currency == Currency.HTG)
                        .Sum(t => t.Amount),
                    TotalDepositUSD = transactions
                        .Where(t => t.Type == TransactionType.Deposit && t.Currency == Currency.USD)
                        .Sum(t => t.Amount),
                    TotalWithdrawalHTG = transactions
                        .Where(t => t.Type == TransactionType.Withdrawal && t.Currency == Currency.HTG)
                        .Sum(t => t.Amount),
                    TotalWithdrawalUSD = transactions
                        .Where(t => t.Type == TransactionType.Withdrawal && t.Currency == Currency.USD)
                        .Sum(t => t.Amount),
                    NetChangeHTG = transactions
                        .Where(t => t.Currency == Currency.HTG)
                        .Sum(t => t.Type == TransactionType.Deposit ? t.Amount : 
                                 t.Type == TransactionType.Withdrawal ? -t.Amount : 0),
                    NetChangeUSD = transactions
                        .Where(t => t.Currency == Currency.USD)
                        .Sum(t => t.Type == TransactionType.Deposit ? t.Amount : 
                                 t.Type == TransactionType.Withdrawal ? -t.Amount : 0)
                }
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching cash session details {SessionId}", sessionId);
            return StatusCode(500, new { message = "Erreur lors du chargement des détails de la session", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir un résumé des sessions de caisse pour le jour
    /// GET /api/cashsession/branch/{branchId}/today-summary
    /// </summary>
    [HttpGet("branch/{branchId}/today-summary")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> GetTodaySummary(int branchId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

            var sessions = await _context.CashSessions
                .Include(cs => cs.User)
                .Where(cs => cs.BranchId == branchId && 
                            cs.SessionStart >= today && 
                            cs.SessionStart < tomorrow)
                .ToListAsync();

            var allTransactions = await _context.Transactions
                .Where(t => t.BranchId == branchId && 
                           t.CreatedAt >= today && 
                           t.CreatedAt < tomorrow)
                .ToListAsync();

            // Get all-time branch fund additions by SuperAdmin
            var fundAdditions = await _context.BranchFundAdditions
                .Where(f => f.BranchId == branchId)
                .ToListAsync();

            // Calculate total branch balance including SuperAdmin funds
            var totalFundsHTG = fundAdditions.Sum(f => f.AmountHTG);
            var totalFundsUSD = fundAdditions.Sum(f => f.AmountUSD);

            var summary = new
            {
                Date = today.ToString("yyyy-MM-dd"),
                TotalSessions = sessions.Count,
                ActiveSessions = sessions.Count(s => s.Status == CashSessionStatus.Open),
                ClosedSessions = sessions.Count(s => s.Status == CashSessionStatus.Closed),
                TotalOpeningBalanceHTG = sessions.Sum(s => s.OpeningBalanceHTG),
                TotalOpeningBalanceUSD = sessions.Sum(s => s.OpeningBalanceUSD),
                TotalClosingBalanceHTG = sessions
                    .Where(s => s.ClosingBalanceHTG.HasValue)
                    .Sum(s => s.ClosingBalanceHTG ?? 0),
                TotalClosingBalanceUSD = sessions
                    .Where(s => s.ClosingBalanceUSD.HasValue)
                    .Sum(s => s.ClosingBalanceUSD ?? 0),
                TotalTransactions = allTransactions.Count,
                // Include SuperAdmin funds in total deposits
                TotalDepositHTG = allTransactions
                    .Where(t => t.Type == TransactionType.Deposit && t.Currency == Currency.HTG)
                    .Sum(t => t.Amount) + totalFundsHTG,
                TotalDepositUSD = allTransactions
                    .Where(t => t.Type == TransactionType.Deposit && t.Currency == Currency.USD)
                    .Sum(t => t.Amount) + totalFundsUSD,
                TotalWithdrawalHTG = allTransactions
                    .Where(t => t.Type == TransactionType.Withdrawal && t.Currency == Currency.HTG)
                    .Sum(t => t.Amount),
                TotalWithdrawalUSD = allTransactions
                    .Where(t => t.Type == TransactionType.Withdrawal && t.Currency == Currency.USD)
                    .Sum(t => t.Amount),
                Cashiers = sessions.Select(s => new
                {
                    UserId = s.UserId,
                    Name = $"{s.User.FirstName} {s.User.LastName}",
                    SessionId = s.Id,
                    Status = s.Status.ToString(),
                    StartTime = s.SessionStart.ToString("HH:mm"),
                    EndTime = s.SessionEnd?.ToString("HH:mm")
                }).ToList()
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching today's summary for branch {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors du chargement du résumé", error = ex.Message });
        }
    }

    /// <summary>
    /// Ouvrir une session de caisse pour un caissier (par un manager)
    /// POST /api/cashsession/open-for-cashier
    /// </summary>
    [HttpPost("open-for-cashier")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> OpenCashSessionForCashier([FromBody] OpenCashSessionForCashierDto model)
    {
        try
        {
            var managerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            // Verify cashier exists and is in the same branch as manager
            var cashier = await _context.Users.FirstOrDefaultAsync(u => u.Id == model.CashierId);
            if (cashier == null)
            {
                return NotFound(new { message = "Caissier non trouvé" });
            }

            if (cashier.Role != UserRole.Cashier)
            {
                return BadRequest(new { message = "L'utilisateur sélectionné n'est pas un caissier" });
            }

            if (!cashier.IsActive)
            {
                return BadRequest(new { message = "Le caissier est inactif" });
            }

            // Check if cashier already has an open session
            var existingSession = await _context.CashSessions
                .FirstOrDefaultAsync(cs => cs.UserId == model.CashierId && cs.Status == CashSessionStatus.Open);

            if (existingSession != null)
            {
                return BadRequest(new { message = "Ce caissier a déjà une session ouverte" });
            }

            // Validate that opening balance does not exceed branch available balance
            int branchId = cashier.BranchId ?? 0;
            if (branchId > 0)
            {
                // Calculate branch available balance (deposits - withdrawals - already allocated to open sessions)
                var branchBalance = await CalculateBranchAvailableBalanceAsync(branchId);
                
                if (model.OpeningBalanceHTG > branchBalance.AvailableHTG)
                {
                    return BadRequest(new 
                    { 
                        message = $"Le montant d'ouverture HTG ({model.OpeningBalanceHTG:N2}) dépasse le solde disponible de la succursale ({branchBalance.AvailableHTG:N2})" 
                    });
                }
                
                if (model.OpeningBalanceUSD > branchBalance.AvailableUSD)
                {
                    return BadRequest(new 
                    { 
                        message = $"Le montant d'ouverture USD ({model.OpeningBalanceUSD:N2}) dépasse le solde disponible de la succursale ({branchBalance.AvailableUSD:N2})" 
                    });
                }
            }

            var cashSession = new CashSession
            {
                UserId = model.CashierId,
                BranchId = cashier.BranchId ?? 0,
                OpeningBalanceHTG = model.OpeningBalanceHTG,
                OpeningBalanceUSD = model.OpeningBalanceUSD,
                SessionStart = DateTime.UtcNow,
                Status = CashSessionStatus.Open,
                Notes = $"Ouvert par manager: {managerId}"
            };

            _context.CashSessions.Add(cashSession);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Cash session opened for cashier {CashierId} by manager {ManagerId}", 
                model.CashierId, managerId);

            return Ok(new
            {
                message = "Session de caisse ouverte avec succès",
                sessionId = cashSession.Id,
                cashierName = $"{cashier.FirstName} {cashier.LastName}",
                branchId = cashSession.BranchId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error opening cash session for cashier");
            return StatusCode(500, new { message = "Erreur lors de l'ouverture de la session", error = ex.Message });
        }
    }

    /// <summary>
    /// Fermer une session de caisse pour un caissier (par un manager)
    /// POST /api/cashsession/{sessionId}/close-by-manager
    /// </summary>
    [HttpPost("{sessionId}/close-by-manager")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> CloseCashSessionByManager(int sessionId, [FromBody] CloseCashSessionByManagerDto model)
    {
        try
        {
            var managerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            var session = await _context.CashSessions
                .Include(cs => cs.User)
                .FirstOrDefaultAsync(cs => cs.Id == sessionId);

            if (session == null)
            {
                return NotFound(new { message = "Session non trouvée" });
            }

            if (session.Status != CashSessionStatus.Open)
            {
                return BadRequest(new { message = "Cette session n'est pas ouverte" });
            }

            session.ClosingBalanceHTG = model.ClosingBalanceHTG;
            session.ClosingBalanceUSD = model.ClosingBalanceUSD;
            session.SessionEnd = DateTime.UtcNow;
            session.Status = CashSessionStatus.Closed;
            session.Notes = session.Notes + $" | Fermé par manager: {managerId}. {model.Notes}";

            await _context.SaveChangesAsync();

            _logger.LogInformation("Cash session {SessionId} closed by manager {ManagerId}", sessionId, managerId);

            return Ok(new
            {
                message = "Session fermée avec succès",
                sessionId = session.Id,
                cashierName = $"{session.User.FirstName} {session.User.LastName}",
                varianceHTG = session.ClosingBalanceHTG.Value - session.OpeningBalanceHTG,
                varianceUSD = session.ClosingBalanceUSD.Value - session.OpeningBalanceUSD
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing cash session {SessionId}", sessionId);
            return StatusCode(500, new { message = "Erreur lors de la fermeture de la session", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir la liste des caissiers disponibles pour une succursale
    /// GET /api/cashsession/available-cashiers/{branchId}
    /// </summary>
    [HttpGet("available-cashiers/{branchId}")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> GetAvailableCashiers(int branchId)
    {
        try
        {
            var cashiers = await _context.Users
                .Where(u => u.BranchId == branchId && 
                           u.Role == UserRole.Cashier && 
                           u.IsActive)
                .Select(u => new
                {
                    u.Id,
                    Name = $"{u.FirstName} {u.LastName}",
                    u.Email,
                    u.PhoneNumber,
                    HasOpenSession = _context.CashSessions
                        .Any(cs => cs.UserId == u.Id && cs.Status == CashSessionStatus.Open)
                })
                .ToListAsync();

            return Ok(cashiers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available cashiers for branch {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors du chargement des caissiers", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir un rapport des sessions fermées pour une période donnée
    /// GET /api/cashsession/branch/{branchId}/reports?startDate=2025-01-01&endDate=2025-01-31
    /// </summary>
    [HttpGet("branch/{branchId}/reports")]
    [Authorize(Roles = "Manager,Admin,SuperAdmin")]
    public async Task<ActionResult> GetCashSessionReports(
        int branchId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var sessions = await _context.CashSessions
                .Include(cs => cs.User)
                .Where(cs => cs.BranchId == branchId 
                    && cs.Status == CashSessionStatus.Closed
                    && cs.SessionStart.Date >= startDate.Date
                    && cs.SessionStart.Date <= endDate.Date)
                .OrderByDescending(cs => cs.SessionStart)
                .Select(cs => new
                {
                    cs.Id,
                    cs.UserId,
                    CashierId = cs.UserId,
                    CashierName = $"{cs.User.FirstName} {cs.User.LastName}",
                    cs.SessionStart,
                    SessionEnd = cs.SessionEnd ?? DateTime.Now,
                    DurationMinutes = cs.SessionEnd.HasValue 
                        ? (int)(cs.SessionEnd.Value - cs.SessionStart).TotalMinutes 
                        : 0,
                    cs.OpeningBalanceHTG,
                    cs.OpeningBalanceUSD,
                    ClosingBalanceHTG = cs.ClosingBalanceHTG ?? 0,
                    ClosingBalanceUSD = cs.ClosingBalanceUSD ?? 0,
                    TotalDepositHTG = _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id 
                            && t.Type == TransactionType.Deposit 
                            && t.Currency == Currency.HTG)
                        .Sum(t => (decimal?)t.Amount) ?? 0,
                    TotalDepositUSD = _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id 
                            && t.Type == TransactionType.Deposit 
                            && t.Currency == Currency.USD)
                        .Sum(t => (decimal?)t.Amount) ?? 0,
                    TotalWithdrawalHTG = _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id 
                            && t.Type == TransactionType.Withdrawal 
                            && t.Currency == Currency.HTG)
                        .Sum(t => (decimal?)t.Amount) ?? 0,
                    TotalWithdrawalUSD = _context.Transactions
                        .Where(t => t.CashSessionId == cs.Id 
                            && t.Type == TransactionType.Withdrawal 
                            && t.Currency == Currency.USD)
                        .Sum(t => (decimal?)t.Amount) ?? 0,
                    TransactionCount = _context.Transactions
                        .Count(t => t.CashSessionId == cs.Id),
                    VarianceHTG = (cs.ClosingBalanceHTG ?? 0) - cs.OpeningBalanceHTG,
                    VarianceUSD = (cs.ClosingBalanceUSD ?? 0) - cs.OpeningBalanceUSD,
                    ClosedByUserId = (string?)null,
                    ClosedByUserName = "Manager",
                    cs.Notes
                })
                .ToListAsync();

            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cash session reports for branch {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors du chargement des rapports", error = ex.Message });
        }
    }

    /// <summary>
    /// Ajouter des fonds à une succursale (SuperAdmin uniquement)
    /// POST /api/cashsession/branch/{branchId}/add-funds
    /// </summary>
    [HttpPost("branch/{branchId}/add-funds")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult> AddFundsToBranch(int branchId, [FromBody] AddFundsToBranchDto model)
    {
        try
        {
            var superAdminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            // Verify branch exists
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch == null)
            {
                return NotFound(new { message = "Succursale non trouvée" });
            }

            // Validate amounts
            if (model.AmountHTG < 0 || model.AmountUSD < 0)
            {
                return BadRequest(new { message = "Les montants doivent être positifs" });
            }

            if (model.AmountHTG == 0 && model.AmountUSD == 0)
            {
                return BadRequest(new { message = "Au moins un montant doit être supérieur à zéro" });
            }

            // Create BranchFundAddition record to track the funds added by SuperAdmin
            var fundAddition = new BranchFundAddition
            {
                BranchId = branchId,
                AddedBy = superAdminId!,
                AmountHTG = model.AmountHTG,
                AmountUSD = model.AmountUSD,
                Notes = model.Notes,
                IsAllocated = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.BranchFundAdditions.Add(fundAddition);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Funds added to branch {BranchId} by SuperAdmin {SuperAdminId}: HTG={AmountHTG}, USD={AmountUSD}, Notes={Notes}", 
                branchId, superAdminId, model.AmountHTG, model.AmountUSD, model.Notes);

            return Ok(new
            {
                message = "Fonds ajoutés avec succès",
                branchId = branchId,
                branchName = branch.Name,
                amountHTG = model.AmountHTG,
                amountUSD = model.AmountUSD,
                notes = model.Notes,
                addedAt = fundAddition.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding funds to branch {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors de l'ajout de fonds", error = ex.Message });
        }
    }

    /// <summary>
    /// Calculate the available balance for a branch (total balance - balance already allocated to open cash sessions)
    /// </summary>
    private async Task<(decimal AvailableHTG, decimal AvailableUSD)> CalculateBranchAvailableBalanceAsync(int branchId)
    {
        // Helper methods for currency comparison
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

        // Calculate total branch balance (deposits - withdrawals)
        var baseTx = await _context.Transactions
            .Where(t => t.BranchId == branchId && t.Status == TransactionStatus.Completed)
            .ToListAsync();

        var savingsTx = await _context.SavingsTransactions
            .Where(t => t.BranchId == branchId && t.Status == SavingsTransactionStatus.Completed)
            .ToListAsync();

        var currentTx = await _context.CurrentAccountTransactions
            .Where(t => t.BranchId == branchId && t.Status == SavingsTransactionStatus.Completed)
            .ToListAsync();

        var termTx = await _context.TermSavingsTransactions
            .Where(t => t.BranchId == branchId && t.Status == SavingsTransactionStatus.Completed)
            .ToListAsync();

        var transfers = await _context.InterBranchTransfers
            .Where(t => (t.FromBranchId == branchId || t.ToBranchId == branchId) && t.Status == TransferStatus.Completed)
            .ToListAsync();

        // Get funds added by SuperAdmin
        var fundAdditions = await _context.BranchFundAdditions
            .Where(f => f.BranchId == branchId)
            .ToListAsync();

        // Calculate HTG balance
        var htgDeposits = 0m
            + baseTx.Where(t => t.Type == TransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
            + savingsTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
            + currentTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
            + termTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
            + transfers.Where(t => t.ToBranchId == branchId && IsHTG(t.Currency)).Sum(t => t.Amount)
            + fundAdditions.Sum(f => f.AmountHTG); // Add SuperAdmin funds

        var htgWithdrawals = 0m
            + baseTx.Where(t => t.Type == TransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
            + savingsTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
            + currentTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
            + termTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
            + transfers.Where(t => t.FromBranchId == branchId && IsHTG(t.Currency)).Sum(t => t.Amount);

        // Calculate USD balance
        var usdDeposits = 0m
            + baseTx.Where(t => t.Type == TransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
            + savingsTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
            + currentTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
            + termTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
            + transfers.Where(t => t.ToBranchId == branchId && IsUSD(t.Currency)).Sum(t => t.Amount)
            + fundAdditions.Sum(f => f.AmountUSD); // Add SuperAdmin funds

        var usdWithdrawals = 0m
            + baseTx.Where(t => t.Type == TransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
            + savingsTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
            + currentTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
            + termTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
            + transfers.Where(t => t.FromBranchId == branchId && IsUSD(t.Currency)).Sum(t => t.Amount);

        var totalBalanceHTG = htgDeposits - htgWithdrawals;
        var totalBalanceUSD = usdDeposits - usdWithdrawals;

        // Calculate balance already allocated to open cash sessions
        var openSessions = await _context.CashSessions
            .Where(cs => cs.BranchId == branchId && cs.Status == CashSessionStatus.Open)
            .ToListAsync();

        var allocatedHTG = openSessions.Sum(cs => cs.OpeningBalanceHTG);
        var allocatedUSD = openSessions.Sum(cs => cs.OpeningBalanceUSD);

        // Available balance = total balance - allocated balance
        var availableHTG = totalBalanceHTG - allocatedHTG;
        var availableUSD = totalBalanceUSD - allocatedUSD;

        return (availableHTG, availableUSD);
    }
}

public class OpenCashSessionForCashierDto
{
    public string CashierId { get; set; } = string.Empty;
    public decimal OpeningBalanceHTG { get; set; }
    public decimal OpeningBalanceUSD { get; set; }
}

public class CloseCashSessionByManagerDto
{
    public decimal ClosingBalanceHTG { get; set; }
    public decimal ClosingBalanceUSD { get; set; }
    public string? Notes { get; set; }
}

public class AddFundsToBranchDto
{
    public decimal AmountHTG { get; set; }
    public decimal AmountUSD { get; set; }
    public string? Notes { get; set; }
}
