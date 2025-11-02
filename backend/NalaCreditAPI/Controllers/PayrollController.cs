using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _payrollService;
        private readonly ILogger<PayrollController> _logger;

        public PayrollController(IPayrollService payrollService, ILogger<PayrollController> logger)
        {
            _payrollService = payrollService;
            _logger = logger;
        }

        private string GetCurrentUser()
        {
            return User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        }

        #region Employee Management

        [HttpPost("employees")]
        public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeDto dto)
        {
            try
            {
                var employee = await _payrollService.CreateEmployeeAsync(dto, GetCurrentUser());
                return Ok(new { success = true, data = employee, message = "Employee created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating employee");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("employees/{employeeId}")]
        public async Task<IActionResult> GetEmployee(Guid employeeId)
        {
            try
            {
                var employee = await _payrollService.GetEmployeeAsync(employeeId);
                return Ok(new { success = true, data = employee });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employee {EmployeeId}", employeeId);
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees([FromQuery] EmployeeSearchDto searchDto)
        {
            try
            {
                var employees = await _payrollService.GetEmployeesAsync(searchDto);
                return Ok(new { success = true, data = employees });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employees");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("employees/{employeeId}")]
        public async Task<IActionResult> UpdateEmployee(Guid employeeId, [FromBody] UpdateEmployeeDto dto)
        {
            try
            {
                var employee = await _payrollService.UpdateEmployeeAsync(employeeId, dto, GetCurrentUser());
                return Ok(new { success = true, data = employee, message = "Employee updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating employee {EmployeeId}", employeeId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("employees/{employeeId}")]
        public async Task<IActionResult> DeleteEmployee(Guid employeeId)
        {
            try
            {
                var result = await _payrollService.DeleteEmployeeAsync(employeeId, GetCurrentUser());
                if (result)
                {
                    return Ok(new { success = true, message = "Employee deleted successfully" });
                }
                return NotFound(new { success = false, message = "Employee not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting employee {EmployeeId}", employeeId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Payroll Period Management

        [HttpPost("periods")]
        public async Task<IActionResult> CreatePayrollPeriod([FromBody] CreatePayrollPeriodDto dto)
        {
            try
            {
                var period = await _payrollService.CreatePayrollPeriodAsync(dto, GetCurrentUser());
                return Ok(new { success = true, data = period, message = "Payroll period created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payroll period");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("periods/{periodId}")]
        public async Task<IActionResult> GetPayrollPeriod(Guid periodId)
        {
            try
            {
                var period = await _payrollService.GetPayrollPeriodAsync(periodId);
                return Ok(new { success = true, data = period });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll period {PeriodId}", periodId);
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("periods")]
        public async Task<IActionResult> GetPayrollPeriods([FromQuery] Guid? branchId)
        {
            try
            {
                var periods = await _payrollService.GetPayrollPeriodsAsync(branchId);
                return Ok(new { success = true, data = periods });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll periods");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("periods/{periodId}/process")]
        public async Task<IActionResult> ProcessPayroll(Guid periodId)
        {
            try
            {
                var period = await _payrollService.ProcessPayrollAsync(periodId, GetCurrentUser());
                return Ok(new { success = true, data = period, message = "Payroll processed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payroll {PeriodId}", periodId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Payslip Management

        [HttpPost("payslips/calculate")]
        public async Task<IActionResult> CalculatePayslip([FromBody] PayrollCalculationDto dto)
        {
            try
            {
                var payslip = await _payrollService.CalculatePayslipAsync(dto, GetCurrentUser());
                return Ok(new { success = true, data = payslip, message = "Payslip calculated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating payslip");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("payslips/{payslipId}")]
        public async Task<IActionResult> GetPayslip(Guid payslipId)
        {
            try
            {
                var payslip = await _payrollService.GetPayslipAsync(payslipId);
                return Ok(new { success = true, data = payslip });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payslip {PayslipId}", payslipId);
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("payslips")]
        public async Task<IActionResult> GetPayslips([FromQuery] PayslipSearchDto searchDto)
        {
            try
            {
                var payslips = await _payrollService.GetPayslipsAsync(searchDto);
                return Ok(new { success = true, data = payslips });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payslips");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("payslips/{payslipId}/approve")]
        public async Task<IActionResult> ApprovePayslip(Guid payslipId)
        {
            try
            {
                var payslip = await _payrollService.ApprovePayslipAsync(payslipId, GetCurrentUser());
                return Ok(new { success = true, data = payslip, message = "Payslip approved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving payslip {PayslipId}", payslipId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("payslips/{payslipId}/pay")]
        public async Task<IActionResult> PayPayslip(Guid payslipId, [FromBody] PayPayslipDto dto)
        {
            try
            {
                var payslip = await _payrollService.PayPayslipAsync(payslipId, dto.PaymentMethod, GetCurrentUser(), dto.TransactionReference);
                return Ok(new { success = true, data = payslip, message = "Payslip paid successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error paying payslip {PayslipId}", payslipId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Salary Advance Management

        [HttpPost("advances")]
        public async Task<IActionResult> CreateSalaryAdvance([FromBody] CreateSalaryAdvanceDto dto)
        {
            try
            {
                var advance = await _payrollService.CreateSalaryAdvanceAsync(dto, GetCurrentUser());
                return Ok(new { success = true, data = advance, message = "Salary advance request created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating salary advance");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("advances")]
        public async Task<IActionResult> GetSalaryAdvances([FromQuery] SalaryAdvanceSearchDto searchDto)
        {
            try
            {
                var advances = await _payrollService.GetSalaryAdvancesAsync(searchDto);
                return Ok(new { success = true, data = advances });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting salary advances");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("advances/{advanceId}/approve")]
        public async Task<IActionResult> ApproveSalaryAdvance(Guid advanceId, [FromBody] ApproveSalaryAdvanceDto dto)
        {
            try
            {
                var advance = await _payrollService.ApproveSalaryAdvanceAsync(advanceId, dto, GetCurrentUser());
                return Ok(new { success = true, data = advance, message = "Salary advance approved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving salary advance {AdvanceId}", advanceId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("advances/{advanceId}/reject")]
        public async Task<IActionResult> RejectSalaryAdvance(Guid advanceId, [FromBody] RejectSalaryAdvanceDto dto)
        {
            try
            {
                var advance = await _payrollService.RejectSalaryAdvanceAsync(advanceId, GetCurrentUser(), dto.Reason);
                return Ok(new { success = true, data = advance, message = "Salary advance rejected successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting salary advance {AdvanceId}", advanceId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("advances/{advanceId}/pay")]
        public async Task<IActionResult> ProcessSalaryAdvancePayment(Guid advanceId, [FromBody] ProcessSalaryAdvancePaymentDto dto)
        {
            try
            {
                var advance = await _payrollService.ProcessSalaryAdvancePaymentAsync(advanceId, dto, GetCurrentUser());
                return Ok(new { success = true, data = advance, message = "Salary advance payment processed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing salary advance payment {AdvanceId}", advanceId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Reports

        [HttpGet("reports/summary")]
        public async Task<IActionResult> GetPayrollSummary([FromQuery] Guid branchId, [FromQuery] DateTime periodStart, [FromQuery] DateTime periodEnd)
        {
            try
            {
                var summary = await _payrollService.GetPayrollSummaryAsync(branchId, periodStart, periodEnd);
                return Ok(new { success = true, data = summary });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll summary");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("reports/payroll/{periodId}")]
        public async Task<IActionResult> GetPayrollReport(Guid periodId)
        {
            try
            {
                var report = await _payrollService.GetPayrollReportAsync(periodId);
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payroll report");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion
    }

    // Helper DTOs for controller endpoints
    public class PayPayslipDto
    {
        public PaymentMethod PaymentMethod { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class RejectSalaryAdvanceDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}