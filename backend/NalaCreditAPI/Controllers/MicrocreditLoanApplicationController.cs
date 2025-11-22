using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrocreditLoanApplicationController : ControllerBase
    {
        private readonly IMicrocreditLoanApplicationService _loanApplicationService;
        private readonly IFileStorageService _fileStorageService;
        private readonly ILogger<MicrocreditLoanApplicationController> _logger;

        public MicrocreditLoanApplicationController(
            IMicrocreditLoanApplicationService loanApplicationService,
            IFileStorageService fileStorageService,
            ILogger<MicrocreditLoanApplicationController> logger)
        {
            _loanApplicationService = loanApplicationService;
            _fileStorageService = fileStorageService;
            _logger = logger;
        }

        /// <summary>
        /// Obtenir une demande de crédit par ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> GetApplication(Guid id)
        {
            try
            {
                var application = await _loanApplicationService.GetApplicationAsync(id);
                if (application == null)
                {
                    return NotFound($"Application with ID {id} not found");
                }

                return Ok(application);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while retrieving the loan application");
            }
        }

        /// <summary>
        /// Obtenir la liste des demandes de crédit avec filtres et pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<MicrocreditApplicationListResponseDto>> GetApplications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] MicrocreditApplicationStatus? status = null,
            [FromQuery] MicrocreditLoanType? loanType = null,
            [FromQuery] int? branchId = null)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 10;

                var result = await _loanApplicationService.GetApplicationsAsync(page, pageSize, status, loanType, branchId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving loan applications");
                return StatusCode(500, "An error occurred while retrieving loan applications");
            }
        }

        /// <summary>
        /// Créer une nouvelle demande de crédit
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> CreateApplication([FromBody] CreateMicrocreditLoanApplicationDto dto)
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
                    return Unauthorized("User ID not found in token");
                }

                var application = await _loanApplicationService.CreateApplicationAsync(dto, userId);
                return CreatedAtAction(nameof(GetApplication), new { id = application.Id }, application);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating loan application");
                return StatusCode(500, "An error occurred while creating the loan application");
            }
        }

        /// <summary>
        /// Mettre à jour une demande de crédit (seulement en statut Draft)
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> UpdateApplication(Guid id, [FromBody] CreateMicrocreditLoanApplicationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var application = await _loanApplicationService.UpdateApplicationAsync(id, dto);
                return Ok(application);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while updating the loan application");
            }
        }

        /// <summary>
        /// Soumettre une demande de crédit pour révision
        /// </summary>
        [HttpPost("{id}/submit")]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> SubmitApplication(Guid id)
        {
            try
            {
                var application = await _loanApplicationService.SubmitApplicationAsync(id);
                return Ok(application);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while submitting the loan application");
            }
        }

        /// <summary>
        /// Réviser une demande de crédit
        /// </summary>
        [HttpPost("{id}/review")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee")]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> ReviewApplication(Guid id, [FromBody] ReviewApplicationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var reviewerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(reviewerId))
                {
                    return Unauthorized("Reviewer ID not found in token");
                }

                var application = await _loanApplicationService.ReviewApplicationAsync(id, reviewerId, dto.Comments);
                return Ok(application);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reviewing loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while reviewing the loan application");
            }
        }

        /// <summary>
        /// Approuver une demande de crédit
        /// </summary>
        [HttpPost("{id}/approve")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee")]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> ApproveApplication(Guid id, [FromBody] ApproveApplicationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var approverId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(approverId))
                {
                    return Unauthorized("Approver ID not found in token");
                }

                var application = await _loanApplicationService.ApproveApplicationAsync(id, approverId, dto.Comments, dto.ApprovedAmount, dto.DisbursementDate);
                return Ok(application);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while approving the loan application");
            }
        }

        /// <summary>
        /// Rejeter une demande de crédit
        /// </summary>
        [HttpPost("{id}/reject")]
        [Authorize(Roles = "SuperAdmin,Admin,Manager,Employee")]
        public async Task<ActionResult<MicrocreditLoanApplicationDto>> RejectApplication(Guid id, [FromBody] RejectApplicationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var rejectedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(rejectedBy))
                {
                    return Unauthorized("User ID not found in token");
                }

                var application = await _loanApplicationService.RejectApplicationAsync(id, rejectedBy, dto.Reason);
                return Ok(application);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while rejecting the loan application");
            }
        }

        /// <summary>
        /// Calculer l'évaluation de risque d'une demande
        /// </summary>
        [HttpGet("{id}/risk-assessment")]
        public async Task<ActionResult<RiskAssessmentDto>> GetRiskAssessment(Guid id)
        {
            try
            {
                var assessment = await _loanApplicationService.CalculateRiskAssessmentAsync(id);
                return Ok(assessment);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating risk assessment for application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while calculating risk assessment");
            }
        }

        /// <summary>
        /// Valider une demande de crédit
        /// </summary>
        [HttpGet("{id}/validate")]
        public async Task<ActionResult<ValidationResultDto>> ValidateApplication(Guid id)
        {
            try
            {
                var isValid = await _loanApplicationService.ValidateApplicationAsync(id);
                return Ok(new ValidationResultDto 
                { 
                    IsValid = isValid,
                    Message = isValid ? "Application is valid" : "Application validation failed"
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating loan application {ApplicationId}", id);
                return StatusCode(500, "An error occurred while validating the loan application");
            }
        }

        /// <summary>
        /// Obtenir les statistiques du tableau de bord
        /// </summary>
        [HttpGet("dashboard/stats")]
        [Authorize]
        public async Task<ActionResult<MicrocreditDashboardStatsDto>> GetDashboardStats([FromQuery] int? branchId = null)
        {
            try
            {
                var stats = await _loanApplicationService.GetDashboardStatsAsync(branchId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard stats");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Obtenir les performances des agents
        /// </summary>
        [HttpGet("dashboard/agent-performance")]
        [Authorize]
        public async Task<ActionResult<List<AgentPerformanceDto>>> GetAgentPerformance([FromQuery] int? branchId = null, [FromQuery] int months = 6)
        {
            try
            {
                var performance = await _loanApplicationService.GetAgentPerformanceAsync(branchId, months);
                return Ok(performance);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving agent performance data");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Obtenir les tendances du portefeuille
        /// </summary>
        [HttpGet("dashboard/portfolio-trend")]
        [Authorize]
        public async Task<ActionResult<List<PortfolioTrendDto>>> GetPortfolioTrend([FromQuery] int? branchId = null, [FromQuery] int months = 12)
        {
            try
            {
                var trends = await _loanApplicationService.GetPortfolioTrendAsync(branchId, months);
                return Ok(trends);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving portfolio trend data");
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Upload un document pour une demande de crédit
        /// </summary>
        [HttpPost("{id}/documents")]
        [RequestSizeLimit(5_242_880)] // 5MB max
        public async Task<ActionResult<MicrocreditApplicationDocumentDto>> UploadDocument(
            Guid id,
            [FromForm] IFormFile file,
            [FromForm] string documentType,
            [FromForm] string? description = null)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized("Utilisateur non authentifié");

                // Parser le type de document
                if (!Enum.TryParse<MicrocreditDocumentType>(documentType, out var docType))
                    return BadRequest(new { message = $"Type de document invalide: {documentType}" });

                var document = await _loanApplicationService.UploadDocumentAsync(id, file, docType, userId, description);

                _logger.LogInformation(
                    "Document uploaded for application {ApplicationId} by user {UserId}",
                    id, userId);

                return Ok(document);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading document for application {ApplicationId}", id);
                return StatusCode(500, new { message = "Erreur lors de l'upload du document" });
            }
        }

        /// <summary>
        /// Obtenir les documents d'une demande de crédit
        /// </summary>
        [HttpGet("{id}/documents")]
        public async Task<ActionResult<List<MicrocreditApplicationDocumentDto>>> GetApplicationDocuments(Guid id)
        {
            try
            {
                var documents = await _loanApplicationService.GetApplicationDocumentsAsync(id);
                return Ok(documents);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving documents for application {ApplicationId}", id);
                return StatusCode(500, new { message = "Erreur lors de la récupération des documents" });
            }
        }

        /// <summary>
        /// Supprimer un document d'une demande de crédit
        /// </summary>
        [HttpDelete("documents/{documentId}")]
        public async Task<IActionResult> DeleteDocument(Guid documentId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized("Utilisateur non authentifié");

                await _loanApplicationService.DeleteDocumentAsync(documentId, userId);

                _logger.LogInformation(
                    "Document {DocumentId} deleted by user {UserId}",
                    documentId, userId);

                return Ok(new { message = "Document supprimé avec succès" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting document {DocumentId}", documentId);
                return StatusCode(500, new { message = "Erreur lors de la suppression du document" });
            }
        }

        /// <summary>
        /// Télécharger un document d'une demande de crédit
        /// </summary>
        [HttpGet("{id}/documents/{documentId}/download")]
        public async Task<IActionResult> DownloadDocument(Guid id, Guid documentId)
        {
            try
            {
                var documents = await _loanApplicationService.GetApplicationDocumentsAsync(id);
                var doc = documents.FirstOrDefault(d => d.Id == documentId);
                if (doc == null)
                {
                    return NotFound(new { message = "Document introuvable pour cette demande" });
                }

                // file path stored is 'microcredit/applications/{applicationId}/documents/{fileName}'
                var fileName = doc.FilePath?.Split('/').Last();
                if (string.IsNullOrEmpty(fileName))
                {
                    return NotFound(new { message = "Nom du fichier introuvable" });
                }

                var (fileBytes, contentType) = await _fileStorageService.GetFileAsync(fileName);
                if (fileBytes == null)
                {
                    return NotFound(new { message = "Fichier introuvable" });
                }

                return File(fileBytes, contentType, doc.Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading document {DocumentId} for application {ApplicationId}", documentId, id);
                return StatusCode(500, new { message = "Erreur lors du téléchargement du document" });
            }
        }
    }

    // DTOs pour les actions de révision/approbation/rejet
    public class ReviewApplicationDto
    {
        [Required]
        public string Comments { get; set; } = string.Empty;
    }

    public class ApproveApplicationDto
    {
        [Required]
        public string Comments { get; set; } = string.Empty;
        
        [Range(0.01, double.MaxValue, ErrorMessage = "Approved amount must be greater than 0")]
        public decimal? ApprovedAmount { get; set; }
        
        public DateTime? DisbursementDate { get; set; }
    }

    public class RejectApplicationDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty;
    }

    public class ValidationResultDto
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}