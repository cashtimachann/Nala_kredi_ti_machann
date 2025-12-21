using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Services;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BranchReportController : ControllerBase
{
    private readonly IBranchReportService _reportService;
    private readonly ILogger<BranchReportController> _logger;

    public BranchReportController(IBranchReportService reportService, ILogger<BranchReportController> logger)
    {
        _reportService = reportService;
        _logger = logger;
    }

    /// <summary>
    /// Générer un rapport journalier pour une succursale
    /// </summary>
    /// <param name="branchId">ID de la succursale</param>
    /// <param name="date">Date du rapport (optionnel, par défaut aujourd'hui)</param>
    [HttpGet("daily/{branchId}")]
    [Authorize(Roles = "Manager,SuperAdmin,Director")]
    public async Task<ActionResult<DailyBranchReportDto>> GetDailyReport(int branchId, [FromQuery] DateTime? date)
    {
        try
        {
            var reportDate = date ?? DateTime.Today;
            var report = await _reportService.GenerateDailyReportAsync(branchId, reportDate);
            
            _logger.LogInformation("Rapport journalier généré pour succursale {BranchId} - Date: {Date}", 
                branchId, reportDate.ToShortDateString());
            
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Succursale introuvable: {BranchId}", branchId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération du rapport journalier pour succursale {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }

    /// <summary>
    /// Générer un rapport mensuel pour une succursale
    /// </summary>
    /// <param name="branchId">ID de la succursale</param>
    /// <param name="month">Mois (1-12)</param>
    /// <param name="year">Année</param>
    [HttpGet("monthly/{branchId}")]
    [Authorize(Roles = "Manager,SuperAdmin,Director")]
    public async Task<ActionResult<MonthlyBranchReportDto>> GetMonthlyReport(
        int branchId, 
        [FromQuery] int? month, 
        [FromQuery] int? year)
    {
        try
        {
            var reportMonth = month ?? DateTime.Today.Month;
            var reportYear = year ?? DateTime.Today.Year;

            if (reportMonth < 1 || reportMonth > 12)
                return BadRequest(new { message = "Le mois doit être entre 1 et 12" });

            var report = await _reportService.GenerateMonthlyReportAsync(branchId, reportMonth, reportYear);
            
            _logger.LogInformation("Rapport mensuel généré pour succursale {BranchId} - {Month}/{Year}", 
                branchId, reportMonth, reportYear);
            
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Succursale introuvable: {BranchId}", branchId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération du rapport mensuel pour succursale {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }

    /// <summary>
    /// Générer un rapport personnalisé avec période spécifique
    /// </summary>
    [HttpPost("custom")]
    [Authorize(Roles = "Manager,SuperAdmin,Director")]
    public async Task<ActionResult<DailyBranchReportDto>> GetCustomReport([FromBody] BranchReportRequestDto request)
    {
        try
        {
            if (request.EndDate <= request.StartDate)
                return BadRequest(new { message = "La date de fin doit être après la date de début" });

            var report = await _reportService.GenerateCustomReportAsync(request);
            
            _logger.LogInformation("Rapport personnalisé généré pour succursale {BranchId} - {StartDate} à {EndDate}", 
                request.BranchId, request.StartDate.ToShortDateString(), request.EndDate.ToShortDateString());
            
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Succursale introuvable: {BranchId}", request.BranchId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération du rapport personnalisé pour succursale {BranchId}", request.BranchId);
            return StatusCode(500, new { message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }

    /// <summary>
    /// Comparer la performance de toutes les succursales
    /// </summary>
    [HttpGet("performance-comparison")]
    [Authorize(Roles = "SuperAdmin,Director")]
    public async Task<ActionResult<BranchPerformanceComparisonDto>> GetPerformanceComparison(
        [FromQuery] DateTime? startDate, 
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var start = startDate ?? DateTime.Today.AddMonths(-1);
            var end = endDate ?? DateTime.Today;

            if (end <= start)
                return BadRequest(new { message = "La date de fin doit être après la date de début" });

            var comparison = await _reportService.GeneratePerformanceComparisonAsync(start, end);
            
            _logger.LogInformation("Comparaison de performance générée - {StartDate} à {EndDate}", 
                start.ToShortDateString(), end.ToShortDateString());
            
            return Ok(comparison);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération de la comparaison de performance");
            return StatusCode(500, new { message = "Erreur lors de la génération de la comparaison", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir le rapport journalier pour la succursale de l'utilisateur connecté
    /// </summary>
    [HttpGet("my-branch/daily")]
    [Authorize(Roles = "Manager,Cashier")]
    public async Task<ActionResult<DailyBranchReportDto>> GetMyBranchDailyReport([FromQuery] DateTime? date)
    {
        try
        {
            var userBranchId = User.FindFirst("BranchId")?.Value;
            
            if (string.IsNullOrEmpty(userBranchId) || !int.TryParse(userBranchId, out int branchId))
            {
                return BadRequest(new { message = "Utilisateur non associé à une succursale" });
            }

            var reportDate = date ?? DateTime.Today;
            var report = await _reportService.GenerateDailyReportAsync(branchId, reportDate);
            
            _logger.LogInformation("Rapport journalier de ma succursale généré - Utilisateur: {UserId}, Succursale: {BranchId}", 
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value, branchId);
            
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Succursale introuvable");
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération du rapport de ma succursale");
            return StatusCode(500, new { message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }

    /// <summary>
    /// Obtenir le rapport mensuel pour la succursale de l'utilisateur connecté
    /// </summary>
    [HttpGet("my-branch/monthly")]
    [Authorize(Roles = "Manager,Cashier")]
    public async Task<ActionResult<MonthlyBranchReportDto>> GetMyBranchMonthlyReport(
        [FromQuery] int? month, 
        [FromQuery] int? year)
    {
        try
        {
            var userBranchId = User.FindFirst("BranchId")?.Value;
            
            if (string.IsNullOrEmpty(userBranchId) || !int.TryParse(userBranchId, out int branchId))
            {
                return BadRequest(new { message = "Utilisateur non associé à une succursale" });
            }

            var reportMonth = month ?? DateTime.Today.Month;
            var reportYear = year ?? DateTime.Today.Year;

            if (reportMonth < 1 || reportMonth > 12)
                return BadRequest(new { message = "Le mois doit être entre 1 et 12" });

            var report = await _reportService.GenerateMonthlyReportAsync(branchId, reportMonth, reportYear);
            
            _logger.LogInformation("Rapport mensuel de ma succursale généré - Utilisateur: {UserId}, Succursale: {BranchId}", 
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value, branchId);
            
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Succursale introuvable");
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération du rapport mensuel de ma succursale");
            return StatusCode(500, new { message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }

    /// <summary>
    /// Exporter un rapport en format CSV
    /// </summary>
    [HttpGet("export/daily/{branchId}")]
    [Authorize(Roles = "Manager,SuperAdmin,Director")]
    public async Task<IActionResult> ExportDailyReportCsv(int branchId, [FromQuery] DateTime? date)
    {
        try
        {
            var reportDate = date ?? DateTime.Today;
            var report = await _reportService.GenerateDailyReportAsync(branchId, reportDate);
            
            var csv = GenerateCsvFromReport(report);
            var fileName = $"rapport_journalier_{report.BranchName}_{reportDate:yyyy-MM-dd}.csv";
            
            return File(System.Text.Encoding.UTF8.GetBytes(csv), "text/csv", fileName);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Succursale introuvable: {BranchId}", branchId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de l'export du rapport");
            return StatusCode(500, new { message = "Erreur lors de l'export du rapport", error = ex.Message });
        }
    }

    private string GenerateCsvFromReport(DailyBranchReportDto report)
    {
        var csv = new System.Text.StringBuilder();
        
        // En-tête
        csv.AppendLine($"RAPPORT JOURNALIER - {report.BranchName}");
        csv.AppendLine($"Date: {report.ReportDate:dd/MM/yyyy}");
        csv.AppendLine();
        
        // Crédits décaissés
        csv.AppendLine("CRÉDITS DÉCAISSÉS");
        csv.AppendLine("Numéro,Client,Montant,Devise,Date");
        foreach (var credit in report.CreditsDisbursed)
        {
            csv.AppendLine($"{credit.CreditNumber},{credit.CustomerName},{credit.Amount},{credit.Currency},{credit.DisbursementDate:dd/MM/yyyy}");
        }
        csv.AppendLine($"Total HTG:,,,{report.TotalCreditsDisbursedHTG}");
        csv.AppendLine($"Total USD:,,,{report.TotalCreditsDisbursedUSD}");
        csv.AppendLine();
        
        // Paiements reçus
        csv.AppendLine("PAIEMENTS REÇUS");
        csv.AppendLine("Crédit,Client,Montant,Principal,Intérêt,Pénalité,Devise,Date");
        foreach (var payment in report.PaymentsReceived)
        {
            csv.AppendLine($"{payment.CreditNumber},{payment.CustomerName},{payment.Amount},{payment.PrincipalPaid},{payment.InterestPaid},{payment.PenaltyPaid},{payment.Currency},{payment.PaymentDate:dd/MM/yyyy}");
        }
        csv.AppendLine($"Total HTG:,,,,,{report.TotalPaymentsReceivedHTG}");
        csv.AppendLine($"Total USD:,,,,,{report.TotalPaymentsReceivedUSD}");
        csv.AppendLine();
        
        // Dépôts
        csv.AppendLine("DÉPÔTS");
        csv.AppendLine("Transaction,Client,Montant,Devise,Date");
        foreach (var deposit in report.Deposits)
        {
            csv.AppendLine($"{deposit.TransactionNumber},{deposit.CustomerName},{deposit.Amount},{deposit.Currency},{deposit.TransactionDate:dd/MM/yyyy}");
        }
        csv.AppendLine($"Total HTG:,,,{report.TotalDepositsHTG}");
        csv.AppendLine($"Total USD:,,,{report.TotalDepositsUSD}");
        csv.AppendLine();
        
        // Retraits
        csv.AppendLine("RETRAITS");
        csv.AppendLine("Transaction,Client,Montant,Devise,Date");
        foreach (var withdrawal in report.Withdrawals)
        {
            csv.AppendLine($"{withdrawal.TransactionNumber},{withdrawal.CustomerName},{withdrawal.Amount},{withdrawal.Currency},{withdrawal.TransactionDate:dd/MM/yyyy}");
        }
        csv.AppendLine($"Total HTG:,,,{report.TotalWithdrawalsHTG}");
        csv.AppendLine($"Total USD:,,,{report.TotalWithdrawalsUSD}");
        csv.AppendLine();
        
        // Solde de caisse
        csv.AppendLine("SOLDE DE CAISSE");
        csv.AppendLine("Solde ouverture HTG:," + report.CashBalance.OpeningBalanceHTG);
        csv.AppendLine("Solde ouverture USD:," + report.CashBalance.OpeningBalanceUSD);
        csv.AppendLine("Solde fermeture HTG:," + report.CashBalance.ClosingBalanceHTG);
        csv.AppendLine("Solde fermeture USD:," + report.CashBalance.ClosingBalanceUSD);
        csv.AppendLine("Variation nette HTG:," + report.CashBalance.NetChangeHTG);
        csv.AppendLine("Variation nette USD:," + report.CashBalance.NetChangeUSD);
        
        return csv.ToString();
    }

    // ==================== ENDPOINTS SUPERADMIN ====================

    /// <summary>
    /// Rapport consolidé de toutes les succursales (SuperAdmin uniquement)
    /// </summary>
    [HttpGet("superadmin/consolidated")]
    [Authorize(Roles = "SuperAdmin,Director")]
    public async Task<ActionResult<SuperAdminConsolidatedReportDto>> GetConsolidatedReport(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        try
        {
            var start = startDate ?? DateTime.Today;
            var end = endDate ?? DateTime.Today.AddDays(1);

            if (end <= start)
                return BadRequest(new { message = "La date de fin doit être après la date de début" });

            var report = await _reportService.GenerateConsolidatedReportAsync(start, end);

            _logger.LogInformation("Rapport consolidé généré par SuperAdmin - {StartDate} à {EndDate}",
                start.ToShortDateString(), end.ToShortDateString());

            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération du rapport consolidé SuperAdmin");
            return StatusCode(500, new { message = "Erreur lors de la génération du rapport", error = ex.Message });
        }
    }

    /// <summary>
    /// Audit complet des transactions avec filtres (SuperAdmin uniquement)
    /// </summary>
    [HttpGet("superadmin/transaction-audit")]
    [Authorize(Roles = "SuperAdmin,Director")]
    public async Task<ActionResult<SuperAdminTransactionAuditDto>> GetTransactionAudit(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? branchId,
        [FromQuery] string? transactionType,
        [FromQuery] string? userId)
    {
        try
        {
            var start = startDate ?? DateTime.Today.AddDays(-7);
            var end = endDate ?? DateTime.Today.AddDays(1);

            if (end <= start)
                return BadRequest(new { message = "La date de fin doit être après la date de début" });

            var audit = await _reportService.GetTransactionAuditAsync(start, end, branchId, transactionType, userId);

            _logger.LogInformation("Audit transactions généré - {Count} transactions trouvées", audit.TotalTransactions);

            return Ok(audit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de l'audit des transactions");
            return StatusCode(500, new { message = "Erreur lors de l'audit", error = ex.Message });
        }
    }

    /// <summary>
    /// Statistiques en temps réel pour dashboard SuperAdmin
    /// </summary>
    [HttpGet("superadmin/dashboard-stats")]
    [Authorize(Roles = "SuperAdmin,Director")]
    public async Task<ActionResult<SuperAdminDashboardStatsDto>> GetDashboardStats()
    {
        try
        {
            var stats = await _reportService.GetDashboardStatsAsync();

            _logger.LogInformation("Statistiques dashboard SuperAdmin récupérées");

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la récupération des statistiques dashboard");
            return StatusCode(500, new { message = "Erreur lors de la récupération des stats", error = ex.Message });
        }
    }

    /// <summary>
    /// Liste de toutes les succursales avec leurs métriques clés
    /// </summary>
    [HttpGet("superadmin/all-branches-overview")]
    [Authorize(Roles = "SuperAdmin,Director")]
    public async Task<ActionResult> GetAllBranchesOverview([FromQuery] DateTime? date)
    {
        try
        {
            var reportDate = date ?? DateTime.Today;
            var startDate = reportDate;
            var endDate = reportDate.AddDays(1);

            var comparison = await _reportService.GeneratePerformanceComparisonAsync(startDate, endDate);

            _logger.LogInformation("Vue d'ensemble de toutes les succursales générée");

            return Ok(comparison);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la génération de la vue d'ensemble");
            return StatusCode(500, new { message = "Erreur lors de la génération", error = ex.Message });
        }
    }

    /// <summary>
    /// Recherche avancée de transactions (SuperAdmin)
    /// </summary>
    [HttpPost("superadmin/search-transactions")]
    [Authorize(Roles = "SuperAdmin,Director")]
    public async Task<ActionResult<SuperAdminTransactionAuditDto>> SearchTransactions(
        [FromBody] TransactionSearchRequestDto request)
    {
        try
        {
            if (request.EndDate <= request.StartDate)
                return BadRequest(new { message = "La date de fin doit être après la date de début" });

            var audit = await _reportService.GetTransactionAuditAsync(
                request.StartDate,
                request.EndDate,
                request.BranchId,
                request.TransactionType,
                request.UserId);

            _logger.LogInformation("Recherche transactions SuperAdmin - {Count} résultats",
                audit.TotalTransactions);

            return Ok(audit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erreur lors de la recherche de transactions");
            return StatusCode(500, new { message = "Erreur lors de la recherche", error = ex.Message });
        }
    }
}

/// <summary>
/// DTO pour la recherche de transactions
/// </summary>
public class TransactionSearchRequestDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int? BranchId { get; set; }
    public string? TransactionType { get; set; }
    public string? UserId { get; set; }
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
}
