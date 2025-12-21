using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Services;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InterBranchTransferController : ControllerBase
{
    private readonly IInterBranchTransferService _transferService;
    private readonly ILogger<InterBranchTransferController> _logger;

    public InterBranchTransferController(
        IInterBranchTransferService transferService,
        ILogger<InterBranchTransferController> logger)
    {
        _transferService = transferService;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<InterBranchTransferDto>> CreateTransfer([FromBody] CreateInterBranchTransferDto dto)
    {
        try
        {
            // Get current user branch ID
            int fromBranchId;
            
            // If FromBranchId is provided in DTO (e.g., by SuperAdmin), use it
            if (dto.FromBranchId.HasValue && dto.FromBranchId.Value > 0)
            {
                fromBranchId = dto.FromBranchId.Value;
            }
            else
            {
                // Otherwise, use user's BranchId claim (required for non-SuperAdmin users)
                var branchClaim = User.FindFirst("BranchId")?.Value;
                if (string.IsNullOrWhiteSpace(branchClaim) || !int.TryParse(branchClaim, out fromBranchId) || fromBranchId <= 0)
                {
                    return BadRequest("BranchId manquant. Veuillez spécifier FromBranchId dans la requête ou assurez-vous que votre compte est associé à une succursale.");
                }
            }

            // Prefer stable user identifier
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User.Identity?.Name
                         ?? "system";

            var result = await _transferService.CreateTransferAsync(dto, fromBranchId, userId);
            return CreatedAtAction(nameof(GetTransfer), new { transferId = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating inter-branch transfer");
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet("{transferId}")]
    public async Task<ActionResult<InterBranchTransferDto>> GetTransfer(Guid transferId)
    {
        try
        {
            var transfer = await _transferService.GetTransferAsync(transferId);
            return Ok(transfer);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transfer {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<InterBranchTransferDto>>> GetTransfers([FromQuery] InterBranchTransferSearchDto searchDto)
    {
        try
        {
            var transfers = await _transferService.GetTransfersAsync(searchDto);
            return Ok(transfers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transfers");
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPut("{transferId}/approve")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<InterBranchTransferDto>> ApproveTransfer(Guid transferId)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name ?? "system";
            var result = await _transferService.ApproveTransferAsync(transferId, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving transfer {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPut("{transferId}/reject")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<InterBranchTransferDto>> RejectTransfer(Guid transferId, [FromBody] RejectInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name ?? "system";
            var result = await _transferService.RejectTransferAsync(transferId, userId, dto.Reason);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting transfer {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPut("{transferId}/process")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<InterBranchTransferDto>> ProcessTransfer(Guid transferId, [FromBody] ProcessInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name ?? "system";
            var result = await _transferService.ProcessTransferAsync(transferId, dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing transfer {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPut("{transferId}/dispatch")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<InterBranchTransferDto>> DispatchTransfer(Guid transferId, [FromBody] DispatchInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                         ?? User.Identity?.Name
                         ?? "system";
            var result = await _transferService.DispatchTransferAsync(transferId, dto, userId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching transfer {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPut("{transferId}/cancel")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<InterBranchTransferDto>> CancelTransfer(Guid transferId, [FromBody] RejectInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name ?? "system";
            var result = await _transferService.CancelTransferAsync(transferId, userId, dto.Reason);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling transfer {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet("consolidated-report")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin")]
    public async Task<ActionResult<ConsolidatedTransferReportDto>> GetConsolidatedReport([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        try
        {
            var report = await _transferService.GetConsolidatedTransferReportAsync(startDate, endDate);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting consolidated transfer report");
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet("{transferId}/logs")]
    public async Task<ActionResult<List<InterBranchTransferLogDto>>> GetTransferLogs(Guid transferId)
    {
        try
        {
            var logs = await _transferService.GetTransferLogsAsync(transferId);
            return Ok(logs);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Transfer not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting transfer logs for {TransferId}", transferId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    private int GetCurrentUserBranchId()
    {
        var branchClaim = User.FindFirst("BranchId")?.Value;
        if (!string.IsNullOrWhiteSpace(branchClaim) && int.TryParse(branchClaim, out var branchId) && branchId > 0)
        {
            return branchId;
        }
        throw new UnauthorizedAccessException("BranchId claim not found for user");
    }
    
    [HttpGet("branch/{branchId}/summary")]
    [Authorize(Roles = "Admin,Manager,SuperAdmin,Director")]
    public async Task<ActionResult<BranchTransferSummaryDto>> GetBranchTransferSummary(int branchId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        try
        {
            var summary = await _transferService.GetBranchTransferSummaryAsync(branchId, startDate, endDate);
            return Ok(summary);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Branch not found: {BranchId}", branchId);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting branch transfer summary for {BranchId}", branchId);
            return StatusCode(500, new { message = "Erreur lors de la récupération du résumé", error = ex.Message });
        }
    }
}