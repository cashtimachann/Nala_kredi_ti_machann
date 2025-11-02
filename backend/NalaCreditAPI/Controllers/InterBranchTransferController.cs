using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Services;

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
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InterBranchTransferDto>> CreateTransfer([FromBody] CreateInterBranchTransferDto dto)
    {
        try
        {
            // Get current user branch ID (this would come from claims or user context)
            var userBranchId = GetCurrentUserBranchId();
            var userId = User.Identity?.Name ?? "system";

            var result = await _transferService.CreateTransferAsync(dto, userBranchId, userId);
            return CreatedAtAction(nameof(GetTransfer), new { transferId = result.Id }, result);
        }
        catch (ArgumentException ex)
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
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InterBranchTransferDto>> ApproveTransfer(Guid transferId)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
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
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InterBranchTransferDto>> RejectTransfer(Guid transferId, [FromBody] RejectInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
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
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InterBranchTransferDto>> ProcessTransfer(Guid transferId, [FromBody] ProcessInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
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

    [HttpPut("{transferId}/cancel")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<InterBranchTransferDto>> CancelTransfer(Guid transferId, [FromBody] RejectInterBranchTransferDto dto)
    {
        try
        {
            var userId = User.Identity?.Name ?? "system";
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
    [Authorize(Roles = "Admin,Manager")]
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
        // This is a placeholder - in a real implementation, you would get this from user claims or database
        // For now, return a default branch ID
        return 1;
    }
}