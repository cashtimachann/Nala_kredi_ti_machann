using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Services;

namespace NalaCreditAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BranchManagementController : ControllerBase
{
    private readonly IBranchService _branchService;
    private readonly ILogger<BranchManagementController> _logger;

    public BranchManagementController(
        IBranchService branchService,
        ILogger<BranchManagementController> logger)
    {
        _branchService = branchService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<BranchDto>>> GetAllBranches()
    {
        try
        {
            var branches = await _branchService.GetAllBranchesAsync();
            return Ok(branches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all branches");
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<BranchDto>>> GetActiveBranches()
    {
        try
        {
            var branches = await _branchService.GetActiveBranchesAsync();
            return Ok(branches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active branches");
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet("{branchId}")]
    public async Task<ActionResult<BranchDto>> GetBranch(int branchId)
    {
        try
        {
            var branch = await _branchService.GetBranchAsync(branchId);
            return Ok(branch);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Branch not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting branch {BranchId}", branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BranchDto>> CreateBranch([FromBody] CreateBranchDto dto)
    {
        try
        {
            var branch = await _branchService.CreateBranchAsync(dto);
            return CreatedAtAction(nameof(GetBranch), new { branchId = branch.Id }, branch);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating branch");
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPut("{branchId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<BranchDto>> UpdateBranch(int branchId, [FromBody] UpdateBranchDto dto)
    {
        try
        {
            var branch = await _branchService.UpdateBranchAsync(branchId, dto);
            return Ok(branch);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Branch not found");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating branch {BranchId}", branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpDelete("{branchId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteBranch(int branchId)
    {
        try
        {
            var result = await _branchService.DeleteBranchAsync(branchId);
            if (!result)
            {
                return NotFound("Branch not found");
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting branch {BranchId}", branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPost("{branchId}/employees/{employeeId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AssignEmployeeToBranch(int branchId, string employeeId)
    {
        try
        {
            var result = await _branchService.AssignEmployeeToBranchAsync(branchId, employeeId);
            return Ok(new { success = result });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning employee {EmployeeId} to branch {BranchId}", employeeId, branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpDelete("{branchId}/employees/{employeeId}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RemoveEmployeeFromBranch(int branchId, string employeeId)
    {
        try
        {
            var result = await _branchService.RemoveEmployeeFromBranchAsync(branchId, employeeId);
            if (!result)
            {
                return NotFound("Employee not found in branch");
            }
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing employee {EmployeeId} from branch {BranchId}", employeeId, branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpGet("{branchId}/employees")]
    public async Task<ActionResult<List<string>>> GetBranchEmployees(int branchId)
    {
        try
        {
            var employees = await _branchService.GetBranchEmployeesAsync(branchId);
            return Ok(employees);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Branch not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting employees for branch {BranchId}", branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }

    [HttpPost("generate-code")]
    public Task<ActionResult<GenerateCodeResponseDto>> GenerateBranchCode([FromBody] GenerateCodeDto dto)
    {
        try
        {
            var code = dto.Name.Replace(" ", "").ToUpper().Substring(0, Math.Min(3, dto.Name.Length)) + DateTime.Now.ToString("yyMM");
            return Task.FromResult<ActionResult<GenerateCodeResponseDto>>(Ok(new GenerateCodeResponseDto { Code = code }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating branch code");
            return Task.FromResult<ActionResult<GenerateCodeResponseDto>>(StatusCode(500, "Une erreur interne s'est produite"));
        }
    }

    [HttpPost("validate-code")]
    public Task<ActionResult<ValidateCodeResponseDto>> ValidateBranchCode([FromBody] ValidateCodeDto dto)
    {
        try
        {
            var isValid = true; // Placeholder uniqueness check
            return Task.FromResult<ActionResult<ValidateCodeResponseDto>>(Ok(new ValidateCodeResponseDto { IsValid = isValid }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating branch code");
            return Task.FromResult<ActionResult<ValidateCodeResponseDto>>(StatusCode(500, "Une erreur interne s'est produite"));
        }
    }

    [HttpPut("{branchId}/manager")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignManager(int branchId, [FromBody] AssignManagerDto dto)
    {
        try
        {
            var updateDto = new UpdateBranchDto
            {
                Id = branchId,
                ManagerId = dto.ManagerId
            };

            await _branchService.UpdateBranchAsync(branchId, updateDto);
            return Ok(new { success = true });
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Branch not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error assigning manager to branch {BranchId}", branchId);
            return StatusCode(500, "Une erreur interne s'est produite");
        }
    }
}