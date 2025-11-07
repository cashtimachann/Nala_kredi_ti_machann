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
        private readonly ILogger<MicrocreditLoanApplicationController> _logger;

        public MicrocreditLoanApplicationController(
            IMicrocreditLoanApplicationService loanApplicationService,
            ILogger<MicrocreditLoanApplicationController> logger)
        {
            _loanApplicationService = loanApplicationService;
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
        [Authorize(Roles = "SuperAdmin,Admin,Manager,LoanOfficer")]
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
        [Authorize(Roles = "SuperAdmin,Admin,Manager,LoanOfficer")]
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

                var application = await _loanApplicationService.ApproveApplicationAsync(id, approverId, dto.Comments, dto.ApprovedAmount);
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
        [Authorize(Roles = "SuperAdmin,Admin,Manager,LoanOfficer")]
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