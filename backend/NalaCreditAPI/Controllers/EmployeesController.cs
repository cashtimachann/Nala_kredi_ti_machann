using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<EmployeesController> _logger;

        public EmployeesController(ApplicationDbContext context, ILogger<EmployeesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetEmployees(
            [FromQuery] Guid? branchId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? position = null,
            [FromQuery] string? searchTerm = null)
        {
            try
            {
                var query = _context.Employees.AsQueryable();

                if (branchId.HasValue)
                {
                    query = query.Where(e => e.BranchId == branchId.Value);
                }

                if (!string.IsNullOrEmpty(status) && Enum.TryParse<EmployeeStatus>(status, out var employeeStatus))
                {
                    query = query.Where(e => e.Status == employeeStatus);
                }

                if (!string.IsNullOrEmpty(position) && Enum.TryParse<EmployeePosition>(position, out var employeePosition))
                {
                    query = query.Where(e => e.Position == employeePosition);
                }

                if (!string.IsNullOrEmpty(searchTerm))
                {
                    var search = searchTerm.ToLower();
                    query = query.Where(e => 
                        e.FirstName.ToLower().Contains(search) ||
                        e.LastName.ToLower().Contains(search) ||
                        e.Email.ToLower().Contains(search) ||
                        e.PhoneNumber.Contains(search) ||
                        e.EmployeeCode.ToLower().Contains(search));
                }

                var employees = await query
                    .OrderBy(e => e.LastName)
                    .ThenBy(e => e.FirstName)
                    .ToListAsync();

                var employeeDtos = employees.Select(e => new EmployeeDto
                {
                    Id = e.Id,
                    EmployeeCode = e.EmployeeCode,
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    MiddleName = e.MiddleName,
                    FullName = e.FullName,
                    Email = e.Email,
                    PhoneNumber = e.PhoneNumber,
                    Address = e.Address,
                    HireDate = e.HireDate,
                    Position = e.Position,
                    PositionName = e.Position.ToString(),
                    Status = e.Status,
                    StatusName = e.Status.ToString(),
                    BaseSalary = e.BaseSalary,
                    Currency = e.Currency,
                    BranchId = e.BranchId,
                    BranchName = e.BranchName,
                    NationalId = e.NationalId,
                    PreferredPaymentMethod = e.PreferredPaymentMethod,
                    PaymentMethodName = e.PreferredPaymentMethod.ToString(),
                    BankAccount = e.BankAccount,
                    BankName = e.BankName,
                    Notes = e.Notes,
                    TerminationDate = e.TerminationDate,
                    CreatedAt = e.CreatedAt,
                    UpdatedAt = e.UpdatedAt,
                    CreatedBy = e.CreatedBy,
                    UpdatedBy = e.UpdatedBy
                }).ToList();

                return Ok(employeeDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employees");
                return StatusCode(500, "Erreur lors de la récupération des employés");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EmployeeDto>> GetEmployee(Guid id)
        {
            try
            {
                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);

                if (employee == null)
                {
                    return NotFound("Employé non trouvé");
                }

                var employeeDto = new EmployeeDto
                {
                    Id = employee.Id,
                    EmployeeCode = employee.EmployeeCode,
                    FirstName = employee.FirstName,
                    LastName = employee.LastName,
                    MiddleName = employee.MiddleName,
                    FullName = employee.FullName,
                    Email = employee.Email,
                    PhoneNumber = employee.PhoneNumber,
                    Address = employee.Address,
                    HireDate = employee.HireDate,
                    Position = employee.Position,
                    PositionName = employee.Position.ToString(),
                    Status = employee.Status,
                    StatusName = employee.Status.ToString(),
                    BaseSalary = employee.BaseSalary,
                    Currency = employee.Currency,
                    BranchId = employee.BranchId,
                    BranchName = employee.BranchName,
                    NationalId = employee.NationalId,
                    PreferredPaymentMethod = employee.PreferredPaymentMethod,
                    PaymentMethodName = employee.PreferredPaymentMethod.ToString(),
                    BankAccount = employee.BankAccount,
                    BankName = employee.BankName,
                    Notes = employee.Notes,
                    TerminationDate = employee.TerminationDate,
                    CreatedAt = employee.CreatedAt,
                    UpdatedAt = employee.UpdatedAt,
                    CreatedBy = employee.CreatedBy,
                    UpdatedBy = employee.UpdatedBy
                };

                return Ok(employeeDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employee {Id}", id);
                return StatusCode(500, "Erreur lors de la récupération de l'employé");
            }
        }

        [HttpPost]
        public async Task<ActionResult<EmployeeDto>> CreateEmployee(CreateEmployeeDto createDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Check if email already exists
                var existingEmployee = await _context.Employees
                    .FirstOrDefaultAsync(e => e.Email == createDto.Email);
                if (existingEmployee != null)
                {
                    return BadRequest("Un employé avec cette adresse email existe déjà");
                }

                // Generate employee code
                var employeeCode = await GenerateEmployeeCodeAsync();

                var employee = new Employee
                {
                    Id = Guid.NewGuid(),
                    EmployeeCode = employeeCode,
                    FirstName = createDto.FirstName,
                    LastName = createDto.LastName,
                    MiddleName = createDto.MiddleName,
                    Position = createDto.Position,
                    Status = EmployeeStatus.Active,
                    BaseSalary = createDto.BaseSalary,
                    Currency = "HTG",
                    HireDate = createDto.HireDate,
                    BranchId = createDto.BranchId,
                    BranchName = await GetBranchNameAsync(createDto.BranchId),
                    PhoneNumber = createDto.PhoneNumber,
                    Email = createDto.Email,
                    Address = createDto.Address,
                    NationalId = createDto.NationalId,
                    PreferredPaymentMethod = createDto.PreferredPaymentMethod,
                    BankAccount = createDto.BankAccount,
                    BankName = createDto.BankName,
                    Notes = createDto.Notes,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = GetCurrentUserEmail(),
                    UpdatedBy = GetCurrentUserEmail()
                };

                _context.Employees.Add(employee);
                await _context.SaveChangesAsync();

                var employeeDto = new EmployeeDto
                {
                    Id = employee.Id,
                    EmployeeCode = employee.EmployeeCode,
                    FirstName = employee.FirstName,
                    LastName = employee.LastName,
                    MiddleName = employee.MiddleName,
                    FullName = employee.FullName,
                    Email = employee.Email,
                    PhoneNumber = employee.PhoneNumber,
                    Address = employee.Address,
                    HireDate = employee.HireDate,
                    Position = employee.Position,
                    PositionName = employee.Position.ToString(),
                    Status = employee.Status,
                    StatusName = employee.Status.ToString(),
                    BaseSalary = employee.BaseSalary,
                    Currency = employee.Currency,
                    BranchId = employee.BranchId,
                    BranchName = employee.BranchName,
                    NationalId = employee.NationalId,
                    PreferredPaymentMethod = employee.PreferredPaymentMethod,
                    PaymentMethodName = employee.PreferredPaymentMethod.ToString(),
                    BankAccount = employee.BankAccount,
                    BankName = employee.BankName,
                    Notes = employee.Notes,
                    CreatedAt = employee.CreatedAt,
                    UpdatedAt = employee.UpdatedAt,
                    CreatedBy = employee.CreatedBy,
                    UpdatedBy = employee.UpdatedBy
                };

                return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, employeeDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating employee");
                return StatusCode(500, "Erreur lors de la création de l'employé");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<EmployeeDto>> UpdateEmployee(Guid id, UpdateEmployeeDto updateDto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);
                if (employee == null)
                {
                    return NotFound("Employé non trouvé");
                }

                // Check if email already exists for another employee
                if (updateDto.Email != employee.Email)
                {
                    var existingEmployee = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Email == updateDto.Email && e.Id != id);
                    if (existingEmployee != null)
                    {
                        return BadRequest("Un autre employé avec cette adresse email existe déjà");
                    }
                }

                // Update employee
                employee.FirstName = updateDto.FirstName;
                employee.LastName = updateDto.LastName;
                employee.MiddleName = updateDto.MiddleName;
                employee.Position = updateDto.Position;
                employee.Status = updateDto.Status;
                employee.BaseSalary = updateDto.BaseSalary;
                employee.PhoneNumber = updateDto.PhoneNumber;
                employee.Email = updateDto.Email;
                employee.Address = updateDto.Address;
                employee.NationalId = updateDto.NationalId;
                employee.PreferredPaymentMethod = updateDto.PreferredPaymentMethod;
                employee.BankAccount = updateDto.BankAccount;
                employee.BankName = updateDto.BankName;
                employee.Notes = updateDto.Notes;
                employee.TerminationDate = updateDto.TerminationDate;
                employee.UpdatedAt = DateTime.UtcNow;
                employee.UpdatedBy = GetCurrentUserEmail();

                await _context.SaveChangesAsync();

                var employeeDto = new EmployeeDto
                {
                    Id = employee.Id,
                    EmployeeCode = employee.EmployeeCode,
                    FirstName = employee.FirstName,
                    LastName = employee.LastName,
                    MiddleName = employee.MiddleName,
                    FullName = employee.FullName,
                    Email = employee.Email,
                    PhoneNumber = employee.PhoneNumber,
                    Address = employee.Address,
                    HireDate = employee.HireDate,
                    Position = employee.Position,
                    PositionName = employee.Position.ToString(),
                    Status = employee.Status,
                    StatusName = employee.Status.ToString(),
                    BaseSalary = employee.BaseSalary,
                    Currency = employee.Currency,
                    BranchId = employee.BranchId,
                    BranchName = employee.BranchName,
                    NationalId = employee.NationalId,
                    PreferredPaymentMethod = employee.PreferredPaymentMethod,
                    PaymentMethodName = employee.PreferredPaymentMethod.ToString(),
                    BankAccount = employee.BankAccount,
                    BankName = employee.BankName,
                    Notes = employee.Notes,
                    TerminationDate = employee.TerminationDate,
                    CreatedAt = employee.CreatedAt,
                    UpdatedAt = employee.UpdatedAt,
                    CreatedBy = employee.CreatedBy,
                    UpdatedBy = employee.UpdatedBy
                };

                return Ok(employeeDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating employee {Id}", id);
                return StatusCode(500, "Erreur lors de la mise à jour de l'employé");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(Guid id)
        {
            try
            {
                var employee = await _context.Employees.FindAsync(id);
                if (employee == null)
                {
                    return NotFound("Employé non trouvé");
                }

                // Check if employee has related records
                var hasPayrollRecords = await _context.Payslips.AnyAsync(p => p.EmployeeId == id);
                var hasSalaryAdvances = await _context.SalaryAdvances.AnyAsync(s => s.EmployeeId == id);

                if (hasPayrollRecords || hasSalaryAdvances)
                {
                    // Soft delete - change status to terminated
                    employee.Status = EmployeeStatus.Terminated;
                    employee.TerminationDate = DateTime.UtcNow;
                    employee.UpdatedAt = DateTime.UtcNow;
                    employee.UpdatedBy = GetCurrentUserEmail();
                    await _context.SaveChangesAsync();
                    return Ok(new { message = "Employé terminé avec succès" });
                }
                else
                {
                    // Hard delete if no related records
                    _context.Employees.Remove(employee);
                    await _context.SaveChangesAsync();
                    return Ok(new { message = "Employé supprimé avec succès" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting employee {Id}", id);
                return StatusCode(500, "Erreur lors de la suppression de l'employé");
            }
        }

        [HttpGet("statistics")]
        public async Task<ActionResult<object>> GetEmployeeStatistics([FromQuery] Guid? branchId = null)
        {
            try
            {
                var query = _context.Employees.AsQueryable();

                if (branchId.HasValue)
                {
                    query = query.Where(e => e.BranchId == branchId.Value);
                }

                var totalEmployees = await query.CountAsync();
                var activeEmployees = await query.CountAsync(e => e.Status == EmployeeStatus.Active);
                var inactiveEmployees = await query.CountAsync(e => e.Status == EmployeeStatus.Inactive);
                var onLeaveEmployees = await query.CountAsync(e => e.Status == EmployeeStatus.OnLeave);
                var terminatedEmployees = await query.CountAsync(e => e.Status == EmployeeStatus.Terminated);

                var positionStats = await query
                    .GroupBy(e => e.Position)
                    .Select(g => new { Position = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync();

                var averageSalary = await query
                    .Where(e => e.Status == EmployeeStatus.Active)
                    .AverageAsync(e => (double?)e.BaseSalary) ?? 0;

                var statistics = new
                {
                    TotalEmployees = totalEmployees,
                    ActiveEmployees = activeEmployees,
                    InactiveEmployees = inactiveEmployees,
                    OnLeaveEmployees = onLeaveEmployees,
                    TerminatedEmployees = terminatedEmployees,
                    PositionDistribution = positionStats,
                    AverageSalary = Math.Round(averageSalary, 2)
                };

                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employee statistics");
                return StatusCode(500, "Erreur lors de la récupération des statistiques des employés");
            }
        }

        private async Task<string> GenerateEmployeeCodeAsync()
        {
            var year = DateTime.Now.Year.ToString();
            var lastEmployee = await _context.Employees
                .Where(e => e.EmployeeCode.StartsWith($"EMP{year}"))
                .OrderByDescending(e => e.EmployeeCode)
                .FirstOrDefaultAsync();

            var sequence = 1;
            if (lastEmployee != null)
            {
                var lastCodePart = lastEmployee.EmployeeCode.Substring(7); // Remove "EMP2025" part
                if (int.TryParse(lastCodePart, out var lastSequence))
                {
                    sequence = lastSequence + 1;
                }
            }

            return $"EMP{year}{sequence:D4}";
        }

        private async Task<string> GetBranchNameAsync(Guid branchId)
        {
            var branch = await _context.Branches.FindAsync(branchId);
            return branch?.Name ?? "Unknown Branch";
        }

        private string GetCurrentUserEmail()
        {
            return User.FindFirst(ClaimTypes.Email)?.Value ?? "System";
        }
    }
}