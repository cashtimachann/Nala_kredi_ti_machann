using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services
{
    public interface IPayrollService
    {
        // Employee Management
        Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeDto dto, string createdBy);
        Task<EmployeeDto> UpdateEmployeeAsync(Guid employeeId, UpdateEmployeeDto dto, string updatedBy);
        Task<EmployeeDto> GetEmployeeAsync(Guid employeeId);
        Task<List<EmployeeDto>> GetEmployeesAsync(EmployeeSearchDto searchDto);
        Task<bool> DeleteEmployeeAsync(Guid employeeId, string deletedBy);

        // Payroll Period Management
        Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodDto dto, string createdBy);
        Task<PayrollPeriodDto> GetPayrollPeriodAsync(Guid periodId);
        Task<List<PayrollPeriodDto>> GetPayrollPeriodsAsync(Guid? branchId = null);
        Task<PayrollPeriodDto> ProcessPayrollAsync(Guid periodId, string processedBy);

        // Payslip Management
        Task<PayslipDto> CalculatePayslipAsync(PayrollCalculationDto dto, string createdBy);
        Task<PayslipDto> GetPayslipAsync(Guid payslipId);
        Task<List<PayslipDto>> GetPayslipsAsync(PayslipSearchDto searchDto);
        Task<PayslipDto> ApprovePayslipAsync(Guid payslipId, string approvedBy);
        Task<PayslipDto> PayPayslipAsync(Guid payslipId, PaymentMethod paymentMethod, string paidBy, string? transactionRef = null);

        // Salary Advance Management
        Task<SalaryAdvanceDto> CreateSalaryAdvanceAsync(CreateSalaryAdvanceDto dto, string requestedBy);
        Task<SalaryAdvanceDto> ApproveSalaryAdvanceAsync(Guid advanceId, ApproveSalaryAdvanceDto dto, string approvedBy);
        Task<SalaryAdvanceDto> RejectSalaryAdvanceAsync(Guid advanceId, string rejectedBy, string reason);
        Task<SalaryAdvanceDto> ProcessSalaryAdvancePaymentAsync(Guid advanceId, ProcessSalaryAdvancePaymentDto dto, string paidBy);
        Task<List<SalaryAdvanceDto>> GetSalaryAdvancesAsync(SalaryAdvanceSearchDto searchDto);

        // Reports
        Task<PayrollSummaryDto> GetPayrollSummaryAsync(Guid branchId, DateTime periodStart, DateTime periodEnd);
        Task<List<PayslipDto>> GetPayrollReportAsync(Guid periodId);
    }

    public class PayrollService : IPayrollService
    {
        private readonly ApplicationDbContext _context;

        public PayrollService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<EmployeeDto> CreateEmployeeAsync(CreateEmployeeDto dto, string createdBy)
        {
            // Generate employee code
            var lastEmployee = await _context.Employees
                .OrderByDescending(e => e.CreatedAt)
                .FirstOrDefaultAsync();

            var employeeCount = 1;
            if (lastEmployee != null && !string.IsNullOrEmpty(lastEmployee.EmployeeCode))
            {
                var parts = lastEmployee.EmployeeCode.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out var lastNumber))
                {
                    employeeCount = lastNumber + 1;
                }
            }

            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                EmployeeCode = $"EMP-{employeeCount:D4}",
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                MiddleName = dto.MiddleName,
                Position = dto.Position,
                Status = EmployeeStatus.Active,
                BranchId = dto.BranchId,
                BranchName = await GetBranchNameAsync(dto.BranchId),
                BaseSalary = dto.BaseSalary,
                HireDate = dto.HireDate,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Address = dto.Address,
                NationalId = dto.NationalId,
                PreferredPaymentMethod = dto.PreferredPaymentMethod,
                BankAccount = dto.BankAccount,
                BankName = dto.BankName,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                CreatedBy = createdBy,
                UpdatedBy = createdBy
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return MapEmployeeToDto(employee);
        }

        public async Task<EmployeeDto> UpdateEmployeeAsync(Guid employeeId, UpdateEmployeeDto dto, string updatedBy)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                throw new InvalidOperationException($"Employee with ID {employeeId} not found");

            employee.FirstName = dto.FirstName;
            employee.LastName = dto.LastName;
            employee.MiddleName = dto.MiddleName;
            employee.Position = dto.Position;
            employee.Status = dto.Status;
            employee.BaseSalary = dto.BaseSalary;
            employee.PhoneNumber = dto.PhoneNumber;
            employee.Email = dto.Email;
            employee.Address = dto.Address;
            employee.NationalId = dto.NationalId;
            employee.PreferredPaymentMethod = dto.PreferredPaymentMethod;
            employee.BankAccount = dto.BankAccount;
            employee.BankName = dto.BankName;
            employee.Notes = dto.Notes;
            employee.TerminationDate = dto.TerminationDate;
            employee.UpdatedAt = DateTime.Now;
            employee.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();
            return MapEmployeeToDto(employee);
        }

        public async Task<EmployeeDto> GetEmployeeAsync(Guid employeeId)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                throw new InvalidOperationException($"Employee with ID {employeeId} not found");

            return MapEmployeeToDto(employee);
        }

        public async Task<List<EmployeeDto>> GetEmployeesAsync(EmployeeSearchDto searchDto)
        {
            var query = _context.Employees.AsQueryable();

            if (!string.IsNullOrWhiteSpace(searchDto.SearchTerm))
            {
                query = query.Where(e => e.FirstName.Contains(searchDto.SearchTerm) ||
                                        e.LastName.Contains(searchDto.SearchTerm) ||
                                        e.EmployeeCode.Contains(searchDto.SearchTerm) ||
                                        e.Email.Contains(searchDto.SearchTerm));
            }

            if (searchDto.BranchId.HasValue)
                query = query.Where(e => e.BranchId == searchDto.BranchId.Value);

            if (searchDto.Position.HasValue)
                query = query.Where(e => e.Position == searchDto.Position.Value);

            if (searchDto.Status.HasValue)
                query = query.Where(e => e.Status == searchDto.Status.Value);

            if (searchDto.HireDateFrom.HasValue)
                query = query.Where(e => e.HireDate >= searchDto.HireDateFrom.Value);

            if (searchDto.HireDateTo.HasValue)
                query = query.Where(e => e.HireDate <= searchDto.HireDateTo.Value);

            var employees = await query
                .OrderBy(e => e.EmployeeCode)
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            return employees.Select(MapEmployeeToDto).ToList();
        }

        public async Task<bool> DeleteEmployeeAsync(Guid employeeId, string deletedBy)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                return false;

            // Check if employee has any payslips or advances
            var hasPayslips = await _context.Payslips.AnyAsync(p => p.EmployeeId == employeeId);
            var hasAdvances = await _context.SalaryAdvances.AnyAsync(s => s.EmployeeId == employeeId);

            if (hasPayslips || hasAdvances)
            {
                // Don't delete, just deactivate
                employee.Status = EmployeeStatus.Terminated;
                employee.TerminationDate = DateTime.Now;
                employee.UpdatedAt = DateTime.Now;
                employee.UpdatedBy = deletedBy;
                await _context.SaveChangesAsync();
            }
            else
            {
                _context.Employees.Remove(employee);
                await _context.SaveChangesAsync();
            }

            return true;
        }

        private async Task<string> GetBranchNameAsync(Guid branchId)
        {
            var branch = await _context.Branches.FindAsync(branchId);
            return branch?.Name ?? "Unknown Branch";
        }

        private EmployeeDto MapEmployeeToDto(Employee employee)
        {
            return new EmployeeDto
            {
                Id = employee.Id,
                EmployeeCode = employee.EmployeeCode,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                MiddleName = employee.MiddleName,
                FullName = employee.FullName,
                Position = employee.Position,
                PositionName = employee.Position.ToString(),
                Status = employee.Status,
                StatusName = employee.Status.ToString(),
                BranchId = employee.BranchId,
                BranchName = employee.BranchName,
                BaseSalary = employee.BaseSalary,
                Currency = employee.Currency,
                HireDate = employee.HireDate,
                TerminationDate = employee.TerminationDate,
                PhoneNumber = employee.PhoneNumber,
                Email = employee.Email,
                Address = employee.Address,
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
        }

        public async Task<PayrollPeriodDto> CreatePayrollPeriodAsync(CreatePayrollPeriodDto dto, string createdBy)
        {
            var period = new PayrollPeriod
            {
                Id = Guid.NewGuid(),
                PeriodName = dto.PeriodName,
                PeriodType = dto.PeriodType,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                PayDate = dto.PayDate,
                Status = PayrollStatus.Draft,
                BranchId = dto.BranchId,
                BranchName = await GetBranchNameAsync(dto.BranchId),
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                CreatedBy = createdBy,
                ProcessedBy = createdBy
            };

            _context.PayrollPeriods.Add(period);
            await _context.SaveChangesAsync();

            return MapPayrollPeriodToDto(period);
        }

        public async Task<PayrollPeriodDto> GetPayrollPeriodAsync(Guid periodId)
        {
            var period = await _context.PayrollPeriods.FindAsync(periodId);
            if (period == null)
                throw new InvalidOperationException($"Payroll period with ID {periodId} not found");

            return MapPayrollPeriodToDto(period);
        }

        public async Task<List<PayrollPeriodDto>> GetPayrollPeriodsAsync(Guid? branchId = null)
        {
            var query = _context.PayrollPeriods.AsQueryable();

            if (branchId.HasValue)
                query = query.Where(p => p.BranchId == branchId.Value);

            var periods = await query
                .OrderByDescending(p => p.StartDate)
                .ToListAsync();

            return periods.Select(MapPayrollPeriodToDto).ToList();
        }

        public async Task<PayrollPeriodDto> ProcessPayrollAsync(Guid periodId, string processedBy)
        {
            var period = await _context.PayrollPeriods
                .Include(p => p.Payslips)
                .FirstOrDefaultAsync(p => p.Id == periodId);

            if (period == null)
                throw new InvalidOperationException($"Payroll period with ID {periodId} not found");

            if (period.Status != PayrollStatus.Draft)
                throw new InvalidOperationException("Only draft payroll periods can be processed");

            // Get all active employees for this branch
            var employees = await _context.Employees
                .Where(e => e.BranchId == period.BranchId && e.Status == EmployeeStatus.Active)
                .ToListAsync();

            period.EmployeeCount = employees.Count;
            period.Status = PayrollStatus.Processing;

            // Calculate totals from existing payslips
            var totalGross = period.Payslips.Sum(p => p.GrossPay);
            var totalDeductions = period.Payslips.Sum(p => p.TotalDeductions);
            var totalNet = period.Payslips.Sum(p => p.NetPay);

            period.TotalGrossPay = totalGross;
            period.TotalDeductions = totalDeductions;
            period.TotalNetPay = totalNet;
            period.ProcessedBy = processedBy;
            period.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapPayrollPeriodToDto(period);
        }

        public async Task<PayslipDto> CalculatePayslipAsync(PayrollCalculationDto dto, string createdBy)
        {
            var employee = await _context.Employees.FindAsync(dto.EmployeeId);
            if (employee == null)
                throw new InvalidOperationException($"Employee with ID {dto.EmployeeId} not found");

            var period = await _context.PayrollPeriods.FindAsync(dto.PayrollPeriodId);
            if (period == null)
                throw new InvalidOperationException($"Payroll period with ID {dto.PayrollPeriodId} not found");

            // Generate payslip number
            var lastPayslip = await _context.Payslips
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();

            var payslipCount = 1;
            if (lastPayslip != null && !string.IsNullOrEmpty(lastPayslip.PayslipNumber))
            {
                var parts = lastPayslip.PayslipNumber.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out var lastNumber))
                {
                    payslipCount = lastNumber + 1;
                }
            }

            // Calculate overtime pay
            var overtimeRate = employee.BaseSalary / 160 * 1.5m; // Assuming 160 hours per month, 1.5x rate
            var overtimePay = dto.OvertimeHours * overtimeRate;

            // Calculate gross pay
            var grossPay = employee.BaseSalary + overtimePay + dto.Bonus + dto.Commission + dto.Allowances;

            // Calculate deductions
            var taxDeduction = grossPay * 0.10m; // 10% tax
            var socialSecurityDeduction = grossPay * 0.05m; // 5% social security

            // Get salary advance deductions for this employee
            var salaryAdvanceDeduction = await CalculateSalaryAdvanceDeductionAsync(dto.EmployeeId, dto.PayrollPeriodId);

            var totalDeductions = taxDeduction + socialSecurityDeduction + salaryAdvanceDeduction;

            // Add custom deductions
            foreach (var deduction in dto.CustomDeductions)
            {
                totalDeductions += deduction.Amount;
            }

            var netPay = grossPay - totalDeductions;

            var payslip = new Payslip
            {
                Id = Guid.NewGuid(),
                PayslipNumber = $"PS-{DateTime.Now:yyyyMM}-{payslipCount:D4}",
                EmployeeId = dto.EmployeeId,
                PayrollPeriodId = dto.PayrollPeriodId,
                BaseSalary = employee.BaseSalary,
                OvertimeHours = dto.OvertimeHours,
                OvertimeRate = overtimeRate,
                OvertimePay = overtimePay,
                Bonus = dto.Bonus,
                Commission = dto.Commission,
                Allowances = dto.Allowances,
                GrossPay = grossPay,
                TaxDeduction = taxDeduction,
                SocialSecurityDeduction = socialSecurityDeduction,
                SalaryAdvanceDeduction = salaryAdvanceDeduction,
                TotalDeductions = totalDeductions,
                NetPay = netPay,
                Currency = employee.Currency,
                Status = PayrollStatus.Draft,
                PaymentMethod = employee.PreferredPaymentMethod,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                CreatedBy = createdBy
            };

            _context.Payslips.Add(payslip);

            // Add custom deductions
            foreach (var deduction in dto.CustomDeductions)
            {
                var payslipDeduction = new PayslipDeduction
                {
                    Id = Guid.NewGuid(),
                    PayslipId = payslip.Id,
                    DeductionType = deduction.DeductionType,
                    Description = deduction.Description,
                    Amount = deduction.Amount,
                    Reference = deduction.Reference,
                    Notes = deduction.Notes
                };
                _context.PayslipDeductions.Add(payslipDeduction);
            }

            await _context.SaveChangesAsync();

            payslip.Employee = employee;
            payslip.PayrollPeriod = period;
            return MapPayslipToDto(payslip);
        }

        public async Task<PayslipDto> GetPayslipAsync(Guid payslipId)
        {
            var payslip = await _context.Payslips
                .Include(p => p.Employee)
                .Include(p => p.PayrollPeriod)
                .Include(p => p.PayslipDeductions)
                .FirstOrDefaultAsync(p => p.Id == payslipId);

            if (payslip == null)
                throw new InvalidOperationException($"Payslip with ID {payslipId} not found");

            return MapPayslipToDto(payslip);
        }

        public async Task<List<PayslipDto>> GetPayslipsAsync(PayslipSearchDto searchDto)
        {
            var query = _context.Payslips
                .Include(p => p.Employee)
                .Include(p => p.PayrollPeriod)
                .AsQueryable();

            if (searchDto.EmployeeId.HasValue)
                query = query.Where(p => p.EmployeeId == searchDto.EmployeeId.Value);

            if (searchDto.PayrollPeriodId.HasValue)
                query = query.Where(p => p.PayrollPeriodId == searchDto.PayrollPeriodId.Value);

            if (searchDto.BranchId.HasValue)
                query = query.Where(p => p.Employee.BranchId == searchDto.BranchId.Value);

            if (searchDto.Status.HasValue)
                query = query.Where(p => p.Status == searchDto.Status.Value);

            if (searchDto.PayDateFrom.HasValue)
                query = query.Where(p => p.PayrollPeriod.PayDate >= DateOnly.FromDateTime(searchDto.PayDateFrom.Value));

            if (searchDto.PayDateTo.HasValue)
                query = query.Where(p => p.PayrollPeriod.PayDate <= DateOnly.FromDateTime(searchDto.PayDateTo.Value));

            var payslips = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            return payslips.Select(MapPayslipToDto).ToList();
        }

        public async Task<PayslipDto> ApprovePayslipAsync(Guid payslipId, string approvedBy)
        {
            var payslip = await _context.Payslips
                .Include(p => p.Employee)
                .Include(p => p.PayrollPeriod)
                .FirstOrDefaultAsync(p => p.Id == payslipId);

            if (payslip == null)
                throw new InvalidOperationException($"Payslip with ID {payslipId} not found");

            if (payslip.Status != PayrollStatus.Draft)
                throw new InvalidOperationException("Only draft payslips can be approved");

            payslip.Status = PayrollStatus.Approved;
            payslip.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapPayslipToDto(payslip);
        }

        public async Task<PayslipDto> PayPayslipAsync(Guid payslipId, PaymentMethod paymentMethod, string paidBy, string? transactionRef = null)
        {
            var payslip = await _context.Payslips
                .Include(p => p.Employee)
                .Include(p => p.PayrollPeriod)
                .FirstOrDefaultAsync(p => p.Id == payslipId);

            if (payslip == null)
                throw new InvalidOperationException($"Payslip with ID {payslipId} not found");

            if (payslip.Status != PayrollStatus.Approved)
                throw new InvalidOperationException("Only approved payslips can be paid");

            payslip.Status = PayrollStatus.Paid;
            payslip.PaymentMethod = paymentMethod;
            payslip.PaidDate = DateTime.Now;
            payslip.PaidBy = paidBy;
            payslip.TransactionReference = transactionRef ?? string.Empty;
            payslip.UpdatedAt = DateTime.Now;

            // Process salary advance deductions
            await ProcessSalaryAdvanceDeductionsAsync(payslip.EmployeeId, payslip.Id, payslip.SalaryAdvanceDeduction);

            await _context.SaveChangesAsync();
            return MapPayslipToDto(payslip);
        }

        public async Task<SalaryAdvanceDto> CreateSalaryAdvanceAsync(CreateSalaryAdvanceDto dto, string requestedBy)
        {
            var employee = await _context.Employees.FindAsync(dto.EmployeeId);
            if (employee == null)
                throw new InvalidOperationException($"Employee with ID {dto.EmployeeId} not found");

            if (employee.Status != EmployeeStatus.Active)
                throw new InvalidOperationException("Only active employees can request salary advances");

            // Check if employee has pending advances
            var hasPendingAdvances = await _context.SalaryAdvances
                .AnyAsync(s => s.EmployeeId == dto.EmployeeId && 
                               (s.Status == SalaryAdvanceStatus.Pending || 
                                s.Status == SalaryAdvanceStatus.Approved ||
                                (s.Status == SalaryAdvanceStatus.Paid && s.RemainingBalance > 0)));

            if (hasPendingAdvances)
                throw new InvalidOperationException("Employee has pending salary advances");

            // Generate advance number
            var lastAdvance = await _context.SalaryAdvances
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            var advanceCount = 1;
            if (lastAdvance != null && !string.IsNullOrEmpty(lastAdvance.AdvanceNumber))
            {
                var parts = lastAdvance.AdvanceNumber.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out var lastNumber))
                {
                    advanceCount = lastNumber + 1;
                }
            }

            var deductionAmount = dto.RequestedAmount / dto.DeductionMonths;

            var advance = new SalaryAdvance
            {
                Id = Guid.NewGuid(),
                AdvanceNumber = $"ADV-{DateTime.Now:yyyyMM}-{advanceCount:D4}",
                EmployeeId = dto.EmployeeId,
                RequestedAmount = dto.RequestedAmount,
                ApprovedAmount = 0, // Will be set during approval
                RequestDate = DateTime.Now,
                Status = SalaryAdvanceStatus.Pending,
                Reason = dto.Reason,
                DeductionAmount = deductionAmount,
                DeductionMonths = dto.DeductionMonths,
                RemainingBalance = dto.RequestedAmount,
                PaymentMethod = dto.PaymentMethod,
                RequestedBy = requestedBy,
                Notes = dto.Notes,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.SalaryAdvances.Add(advance);
            await _context.SaveChangesAsync();

            advance.Employee = employee;
            return MapSalaryAdvanceToDto(advance);
        }

        public async Task<SalaryAdvanceDto> ApproveSalaryAdvanceAsync(Guid advanceId, ApproveSalaryAdvanceDto dto, string approvedBy)
        {
            var advance = await _context.SalaryAdvances
                .Include(s => s.Employee)
                .FirstOrDefaultAsync(s => s.Id == advanceId);

            if (advance == null)
                throw new InvalidOperationException($"Salary advance with ID {advanceId} not found");

            if (advance.Status != SalaryAdvanceStatus.Pending)
                throw new InvalidOperationException("Only pending salary advances can be approved");

            advance.ApprovedAmount = dto.ApprovedAmount;
            advance.DeductionMonths = dto.DeductionMonths;
            advance.DeductionAmount = dto.ApprovedAmount / dto.DeductionMonths;
            advance.RemainingBalance = dto.ApprovedAmount;
            advance.PaymentMethod = dto.PaymentMethod;
            advance.Status = SalaryAdvanceStatus.Approved;
            advance.ApprovalDate = DateTime.Now;
            advance.ApprovedBy = approvedBy;
            advance.ApprovalNotes = dto.ApprovalNotes;
            advance.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapSalaryAdvanceToDto(advance);
        }

        public async Task<SalaryAdvanceDto> RejectSalaryAdvanceAsync(Guid advanceId, string rejectedBy, string reason)
        {
            var advance = await _context.SalaryAdvances
                .Include(s => s.Employee)
                .FirstOrDefaultAsync(s => s.Id == advanceId);

            if (advance == null)
                throw new InvalidOperationException($"Salary advance with ID {advanceId} not found");

            if (advance.Status != SalaryAdvanceStatus.Pending)
                throw new InvalidOperationException("Only pending salary advances can be rejected");

            advance.Status = SalaryAdvanceStatus.Rejected;
            advance.ApprovalDate = DateTime.Now;
            advance.ApprovedBy = rejectedBy;
            advance.ApprovalNotes = reason;
            advance.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapSalaryAdvanceToDto(advance);
        }

        public async Task<SalaryAdvanceDto> ProcessSalaryAdvancePaymentAsync(Guid advanceId, ProcessSalaryAdvancePaymentDto dto, string paidBy)
        {
            var advance = await _context.SalaryAdvances
                .Include(s => s.Employee)
                .FirstOrDefaultAsync(s => s.Id == advanceId);

            if (advance == null)
                throw new InvalidOperationException($"Salary advance with ID {advanceId} not found");

            if (advance.Status != SalaryAdvanceStatus.Approved)
                throw new InvalidOperationException("Only approved salary advances can be paid");

            advance.Status = SalaryAdvanceStatus.Paid;
            advance.PaymentDate = DateTime.Now;
            advance.PaymentMethod = dto.PaymentMethod;
            advance.TransactionReference = dto.TransactionReference;
            advance.PaidBy = paidBy;
            advance.Notes = $"{advance.Notes} {dto.Notes}".Trim();
            advance.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapSalaryAdvanceToDto(advance);
        }

        public async Task<List<SalaryAdvanceDto>> GetSalaryAdvancesAsync(SalaryAdvanceSearchDto searchDto)
        {
            var query = _context.SalaryAdvances
                .Include(s => s.Employee)
                .AsQueryable();

            if (searchDto.EmployeeId.HasValue)
                query = query.Where(s => s.EmployeeId == searchDto.EmployeeId.Value);

            if (searchDto.BranchId.HasValue)
                query = query.Where(s => s.Employee.BranchId == searchDto.BranchId.Value);

            if (searchDto.Status.HasValue)
                query = query.Where(s => s.Status == searchDto.Status.Value);

            if (searchDto.RequestDateFrom.HasValue)
                query = query.Where(s => s.RequestDate >= searchDto.RequestDateFrom.Value);

            if (searchDto.RequestDateTo.HasValue)
                query = query.Where(s => s.RequestDate <= searchDto.RequestDateTo.Value);

            if (searchDto.AmountFrom.HasValue)
                query = query.Where(s => s.RequestedAmount >= searchDto.AmountFrom.Value);

            if (searchDto.AmountTo.HasValue)
                query = query.Where(s => s.RequestedAmount <= searchDto.AmountTo.Value);

            var advances = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            return advances.Select(MapSalaryAdvanceToDto).ToList();
        }

        public async Task<PayrollSummaryDto> GetPayrollSummaryAsync(Guid branchId, DateTime periodStart, DateTime periodEnd)
        {
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch == null)
                throw new InvalidOperationException($"Branch with ID {branchId} not found");

            var employees = await _context.Employees
                .Where(e => e.BranchId == branchId)
                .ToListAsync();

            var activeEmployees = employees.Where(e => e.Status == EmployeeStatus.Active).ToList();

            var payslips = await _context.Payslips
                .Include(p => p.Employee)
                .Include(p => p.PayrollPeriod)
                .Where(p => p.Employee.BranchId == branchId &&
                           p.PayrollPeriod.StartDate >= DateOnly.FromDateTime(periodStart) &&
                           p.PayrollPeriod.EndDate <= DateOnly.FromDateTime(periodEnd))
                .ToListAsync();

            var advances = await _context.SalaryAdvances
                .Include(s => s.Employee)
                .Where(s => s.Employee.BranchId == branchId &&
                           s.RequestDate >= periodStart &&
                           s.RequestDate <= periodEnd &&
                           s.Status == SalaryAdvanceStatus.Paid)
                .ToListAsync();

            return new PayrollSummaryDto
            {
                BranchId = branchId,
                BranchName = branch.Name,
                TotalEmployees = employees.Count,
                ActiveEmployees = activeEmployees.Count,
                TotalBaseSalary = activeEmployees.Sum(e => e.BaseSalary),
                TotalGrossPay = payslips.Sum(p => p.GrossPay),
                TotalDeductions = payslips.Sum(p => p.TotalDeductions),
                TotalNetPay = payslips.Sum(p => p.NetPay),
                TotalOvertimePay = payslips.Sum(p => p.OvertimePay),
                TotalBonus = payslips.Sum(p => p.Bonus),
                TotalAdvances = advances.Sum(s => s.ApprovedAmount),
                PeriodStart = periodStart,
                PeriodEnd = periodEnd
            };
        }

        public async Task<List<PayslipDto>> GetPayrollReportAsync(Guid periodId)
        {
            var payslips = await _context.Payslips
                .Include(p => p.Employee)
                .Include(p => p.PayrollPeriod)
                .Include(p => p.PayslipDeductions)
                .Where(p => p.PayrollPeriodId == periodId)
                .OrderBy(p => p.Employee.EmployeeCode)
                .ToListAsync();

            return payslips.Select(MapPayslipToDto).ToList();
        }

        // Helper methods
        private async Task<decimal> CalculateSalaryAdvanceDeductionAsync(Guid employeeId, Guid payrollPeriodId)
        {
            var advances = await _context.SalaryAdvances
                .Where(s => s.EmployeeId == employeeId &&
                           s.Status == SalaryAdvanceStatus.Paid &&
                           s.RemainingBalance > 0)
                .ToListAsync();

            return advances.Sum(s => Math.Min(s.DeductionAmount, s.RemainingBalance));
        }

        private async Task ProcessSalaryAdvanceDeductionsAsync(Guid employeeId, Guid payslipId, decimal deductedAmount)
        {
            var advances = await _context.SalaryAdvances
                .Where(s => s.EmployeeId == employeeId &&
                           s.Status == SalaryAdvanceStatus.Paid &&
                           s.RemainingBalance > 0)
                .OrderBy(s => s.PaymentDate)
                .ToListAsync();

            var remainingDeduction = deductedAmount;

            foreach (var advance in advances)
            {
                if (remainingDeduction <= 0) break;

                var deductionAmount = Math.Min(advance.DeductionAmount, Math.Min(advance.RemainingBalance, remainingDeduction));
                
                if (deductionAmount > 0)
                {
                    var advanceDeduction = new SalaryAdvanceDeduction
                    {
                        Id = Guid.NewGuid(),
                        SalaryAdvanceId = advance.Id,
                        PayslipId = payslipId,
                        DeductedAmount = deductionAmount,
                        DeductionDate = DateTime.Now,
                        Notes = $"Deduction from payslip"
                    };

                    _context.SalaryAdvanceDeductions.Add(advanceDeduction);

                    advance.TotalDeducted += deductionAmount;
                    advance.RemainingBalance -= deductionAmount;

                    if (advance.RemainingBalance <= 0)
                    {
                        advance.Status = SalaryAdvanceStatus.FullyDeducted;
                    }

                    remainingDeduction -= deductionAmount;
                }
            }
        }

        private PayrollPeriodDto MapPayrollPeriodToDto(PayrollPeriod period)
        {
            return new PayrollPeriodDto
            {
                Id = period.Id,
                PeriodName = period.PeriodName,
                PeriodType = period.PeriodType,
                PeriodTypeName = period.PeriodType.ToString(),
                StartDate = period.StartDate,
                EndDate = period.EndDate,
                PayDate = period.PayDate,
                Status = period.Status,
                StatusName = period.Status.ToString(),
                BranchId = period.BranchId,
                BranchName = period.BranchName,
                TotalGrossPay = period.TotalGrossPay,
                TotalDeductions = period.TotalDeductions,
                TotalNetPay = period.TotalNetPay,
                EmployeeCount = period.EmployeeCount,
                Notes = period.Notes,
                CreatedAt = period.CreatedAt,
                UpdatedAt = period.UpdatedAt,
                CreatedBy = period.CreatedBy,
                ProcessedBy = period.ProcessedBy
            };
        }

        private PayslipDto MapPayslipToDto(Payslip payslip)
        {
            return new PayslipDto
            {
                Id = payslip.Id,
                PayslipNumber = payslip.PayslipNumber,
                EmployeeId = payslip.EmployeeId,
                EmployeeCode = payslip.Employee?.EmployeeCode ?? string.Empty,
                EmployeeName = payslip.Employee?.FullName ?? string.Empty,
                Position = payslip.Employee?.Position ?? EmployeePosition.Other,
                PositionName = payslip.Employee?.Position.ToString() ?? string.Empty,
                PayrollPeriodId = payslip.PayrollPeriodId,
                PeriodName = payslip.PayrollPeriod?.PeriodName ?? string.Empty,
                StartDate = payslip.PayrollPeriod?.StartDate ?? DateOnly.MinValue,
                EndDate = payslip.PayrollPeriod?.EndDate ?? DateOnly.MinValue,
                PayDate = payslip.PayrollPeriod?.PayDate ?? DateOnly.MinValue,
                BaseSalary = payslip.BaseSalary,
                OvertimeHours = payslip.OvertimeHours,
                OvertimeRate = payslip.OvertimeRate,
                OvertimePay = payslip.OvertimePay,
                Bonus = payslip.Bonus,
                Commission = payslip.Commission,
                Allowances = payslip.Allowances,
                GrossPay = payslip.GrossPay,
                TaxDeduction = payslip.TaxDeduction,
                InsuranceDeduction = payslip.InsuranceDeduction,
                SocialSecurityDeduction = payslip.SocialSecurityDeduction,
                SalaryAdvanceDeduction = payslip.SalaryAdvanceDeduction,
                LoanDeduction = payslip.LoanDeduction,
                OtherDeductions = payslip.OtherDeductions,
                TotalDeductions = payslip.TotalDeductions,
                NetPay = payslip.NetPay,
                Currency = payslip.Currency,
                Status = payslip.Status,
                StatusName = payslip.Status.ToString(),
                PaymentMethod = payslip.PaymentMethod,
                PaymentMethodName = payslip.PaymentMethod.ToString(),
                PaidDate = payslip.PaidDate,
                PaidBy = payslip.PaidBy,
                TransactionReference = payslip.TransactionReference,
                Notes = payslip.Notes,
                CreatedAt = payslip.CreatedAt,
                UpdatedAt = payslip.UpdatedAt,
                CreatedBy = payslip.CreatedBy,
                Deductions = payslip.PayslipDeductions?.Select(d => new PayslipDeductionDto
                {
                    Id = d.Id,
                    DeductionType = d.DeductionType,
                    DeductionTypeName = d.DeductionType.ToString(),
                    Description = d.Description,
                    Amount = d.Amount,
                    Reference = d.Reference,
                    Notes = d.Notes
                }).ToList() ?? new List<PayslipDeductionDto>()
            };
        }

        private SalaryAdvanceDto MapSalaryAdvanceToDto(SalaryAdvance advance)
        {
            return new SalaryAdvanceDto
            {
                Id = advance.Id,
                AdvanceNumber = advance.AdvanceNumber,
                EmployeeId = advance.EmployeeId,
                EmployeeCode = advance.Employee?.EmployeeCode ?? string.Empty,
                EmployeeName = advance.Employee?.FullName ?? string.Empty,
                EmployeePosition = advance.Employee?.Position.ToString() ?? string.Empty,
                RequestedAmount = advance.RequestedAmount,
                ApprovedAmount = advance.ApprovedAmount,
                Currency = advance.Currency,
                RequestDate = advance.RequestDate,
                ApprovalDate = advance.ApprovalDate,
                PaymentDate = advance.PaymentDate,
                Status = advance.Status,
                StatusName = advance.Status.ToString(),
                Reason = advance.Reason,
                DeductionAmount = advance.DeductionAmount,
                DeductionMonths = advance.DeductionMonths,
                TotalDeducted = advance.TotalDeducted,
                RemainingBalance = advance.RemainingBalance,
                PaymentMethod = advance.PaymentMethod,
                PaymentMethodName = advance.PaymentMethod.ToString(),
                TransactionReference = advance.TransactionReference,
                RequestedBy = advance.RequestedBy,
                ApprovedBy = advance.ApprovedBy,
                PaidBy = advance.PaidBy,
                ApprovalNotes = advance.ApprovalNotes,
                Notes = advance.Notes,
                CreatedAt = advance.CreatedAt,
                UpdatedAt = advance.UpdatedAt,
                Deductions = advance.SalaryAdvanceDeductions?.Select(d => new SalaryAdvanceDeductionDto
                {
                    Id = d.Id,
                    PayslipId = d.PayslipId,
                    PayslipNumber = d.Payslip?.PayslipNumber ?? string.Empty,
                    DeductedAmount = d.DeductedAmount,
                    DeductionDate = d.DeductionDate,
                    Notes = d.Notes
                }).ToList() ?? new List<SalaryAdvanceDeductionDto>()
            };
        }
    }
}