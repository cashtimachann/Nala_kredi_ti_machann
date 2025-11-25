using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace NalaCreditAPI.Services;

public interface IBranchService
{
    Task<List<BranchDto>> GetAllBranchesAsync();
    Task<BranchDto> GetBranchAsync(int branchId);
    Task<BranchDto> CreateBranchAsync(CreateBranchDto dto);
    Task<BranchDto> UpdateBranchAsync(int branchId, UpdateBranchDto dto);
    Task<bool> DeleteBranchAsync(int branchId);
    Task<List<BranchDto>> GetActiveBranchesAsync();
    Task<bool> AssignEmployeeToBranchAsync(int branchId, string employeeId);
    Task<bool> RemoveEmployeeFromBranchAsync(int branchId, string employeeId);
    Task<List<string>> GetBranchEmployeesAsync(int branchId);
}

public class BranchService : IBranchService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BranchService> _logger;

    public BranchService(
        ApplicationDbContext context,
        ILogger<BranchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<BranchDto>> GetAllBranchesAsync()
    {
        var branches = await _context.Branches
            .Include(b => b.Users)
            .OrderBy(b => b.Name)
            .ToListAsync();

        return branches.Select(MapToDto).ToList();
    }

    public async Task<BranchDto> GetBranchAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.Users)
            .Include(b => b.Manager)
            .FirstOrDefaultAsync(b => b.Id == branchId);

        if (branch == null)
        {
            throw new KeyNotFoundException("Branch not found");
        }

        return MapToDto(branch);
    }

    public async Task<BranchDto> CreateBranchAsync(CreateBranchDto dto)
    {
        // Validate unique branch code
        if (!string.IsNullOrEmpty(dto.Code) && await _context.Branches.AnyAsync(b => b.Code == dto.Code))
        {
            throw new ArgumentException("Branch code must be unique");
        }

        // Validate manager if provided
        string? managerName = null;
        if (!string.IsNullOrEmpty(dto.ManagerId))
        {
            var manager = await _context.Users.FindAsync(dto.ManagerId);
            if (manager == null)
            {
                throw new ArgumentException("Manager not found");
            }
            managerName = $"{manager.FirstName ?? ""} {manager.LastName ?? ""}".Trim();
        }

        // Robust OpeningDate parsing with fallback
        DateTime openingDateValue;
        if (!string.IsNullOrWhiteSpace(dto.OpeningDate) &&
            DateTime.TryParseExact(dto.OpeningDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var exactOpening))
        {
            openingDateValue = exactOpening;
        }
        else if (DateTime.TryParse(dto.OpeningDate, out var fallbackParsed))
        {
            openingDateValue = fallbackParsed;
        }
        else
        {
            _logger.LogWarning("CreateBranchAsync: Invalid OpeningDate '{OpeningDate}', using UTC now", dto.OpeningDate);
            openingDateValue = DateTime.UtcNow;
        }

        var branch = new Branch
        {
            Code = dto.Code ?? GenerateBranchCode(dto.Name),
            Name = dto.Name,
            Address = dto.Address,
            Commune = dto.Commune,
            Department = dto.Department,
            Region = dto.Department ?? "Haiti", // Default region
            Phones = dto.Phones ?? new List<string>(),
            Email = dto.Email,
            OpeningDate = openingDateValue,
            ManagerId = dto.ManagerId,
            ManagerName = managerName,
            MaxEmployees = dto.MaxEmployees,
            PrimaryCurrency = Currency.HTG, // Default
            AcceptsUSD = true,
            AcceptsHTG = true,
            DailyTransactionLimit = dto.Limits.DailyDepositLimit,
            CashLimit = dto.Limits.MinCashReserveHTG,
            OpenTime = (dto.OperatingHours != null && TimeSpan.TryParse(dto.OperatingHours.OpenTime, out var ct)) ? ct : new TimeSpan(8, 0, 0),
            CloseTime = (dto.OperatingHours != null && TimeSpan.TryParse(dto.OperatingHours.CloseTime, out var ct2)) ? ct2 : new TimeSpan(17, 0, 0),
            ClosedDays = dto.OperatingHours?.ClosedDays ?? new List<int>(),
            DailyWithdrawalLimit = dto.Limits.DailyWithdrawalLimit,
            DailyDepositLimit = dto.Limits.DailyDepositLimit,
            MaxLocalCreditApproval = dto.Limits.MaxLocalCreditApproval,
            MinCashReserveHTG = dto.Limits.MinCashReserveHTG,
            MinCashReserveUSD = dto.Limits.MinCashReserveUSD,
            IsActive = dto.Status == "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Branches.Add(branch);
        await _context.SaveChangesAsync();

        return MapToDto(branch);
    }

    public async Task<BranchDto> UpdateBranchAsync(int branchId, UpdateBranchDto dto)
    {
        var branch = await _context.Branches.FindAsync(branchId);
        if (branch == null)
        {
            throw new KeyNotFoundException("Branch not found");
        }

        // Validate unique branch code if changed
        if (!string.IsNullOrEmpty(dto.Code) && dto.Code != branch.Code)
        {
            if (await _context.Branches.AnyAsync(b => b.Code == dto.Code && b.Id != branchId))
            {
                throw new ArgumentException("Branch code must be unique");
            }
            branch.Code = dto.Code;
        }

        if (!string.IsNullOrEmpty(dto.Name))
            branch.Name = dto.Name;

        if (!string.IsNullOrEmpty(dto.Address))
            branch.Address = dto.Address;

        if (!string.IsNullOrEmpty(dto.Commune))
            branch.Commune = dto.Commune;

        if (!string.IsNullOrEmpty(dto.Department))
        {
            branch.Department = dto.Department;
            branch.Region = dto.Department; // Update region to match department
        }

        if (dto.Phones != null)
            branch.Phones = dto.Phones;

        if (!string.IsNullOrEmpty(dto.Email))
            branch.Email = dto.Email;

        if (!string.IsNullOrEmpty(dto.ManagerId))
        {
            // Validate that the manager exists and get their name
            var manager = await _context.Users.FindAsync(dto.ManagerId);
            if (manager == null)
            {
                throw new ArgumentException("Manager not found");
            }
            branch.ManagerId = dto.ManagerId;
            branch.ManagerName = $"{manager.FirstName ?? ""} {manager.LastName ?? ""}".Trim();
        }

        if (!string.IsNullOrEmpty(dto.Status))
            branch.IsActive = dto.Status == "Active";

        // Safely update operating hours if provided
        if (dto.OperatingHours != null)
        {
            _logger.LogInformation("UpdateBranchAsync: incoming operating hours open='{OpenTime}' close='{CloseTime}'", dto.OperatingHours.OpenTime, dto.OperatingHours.CloseTime);
            // Always try to parse and update OpenTime if provided (even if empty, we want to update it)
            if (dto.OperatingHours.OpenTime != null)
            {
                if (TimeSpan.TryParse(dto.OperatingHours.OpenTime, out var parsedOpen))
                {
                    branch.OpenTime = parsedOpen;
                    _logger.LogInformation("UpdateBranchAsync: parsed open time '{ParsedOpen}'", parsedOpen);
                }
                else if (!string.IsNullOrWhiteSpace(dto.OperatingHours.OpenTime))
                {
                    _logger.LogWarning($"Failed to parse OpenTime: {dto.OperatingHours.OpenTime}");
                }
            }

            // Always try to parse and update CloseTime if provided (even if empty, we want to update it)
            if (dto.OperatingHours.CloseTime != null)
            {
                if (TimeSpan.TryParse(dto.OperatingHours.CloseTime, out var parsedClose))
                {
                    branch.CloseTime = parsedClose;
                    _logger.LogInformation("UpdateBranchAsync: parsed close time '{ParsedClose}'", parsedClose);
                }
                else if (!string.IsNullOrWhiteSpace(dto.OperatingHours.CloseTime))
                {
                    _logger.LogWarning($"Failed to parse CloseTime: {dto.OperatingHours.CloseTime}");
                }
            }

            if (dto.OperatingHours.ClosedDays != null)
            {
                branch.ClosedDays = dto.OperatingHours.ClosedDays;
            }
        }

        // Safely update limits and counts
        if (dto.Limits != null)
        {
            if (dto.Limits.DailyWithdrawalLimit >= 0)
                branch.DailyWithdrawalLimit = dto.Limits.DailyWithdrawalLimit;
            
            if (dto.Limits.DailyDepositLimit >= 0)
                branch.DailyDepositLimit = dto.Limits.DailyDepositLimit;
            
            if (dto.Limits.MaxLocalCreditApproval >= 0)
                branch.MaxLocalCreditApproval = dto.Limits.MaxLocalCreditApproval;
            
            if (dto.Limits.MinCashReserveHTG >= 0)
                branch.MinCashReserveHTG = dto.Limits.MinCashReserveHTG;
            
            if (dto.Limits.MinCashReserveUSD >= 0)
                branch.MinCashReserveUSD = dto.Limits.MinCashReserveUSD;
        }

        if (dto.MaxEmployees > 0)
            branch.MaxEmployees = dto.MaxEmployees;

        if (!string.IsNullOrWhiteSpace(dto.OpeningDate))
        {
            // Prefer exact yyyy-MM-dd format; fallback to any parseable format
            if (DateTime.TryParseExact(dto.OpeningDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var updatedExact))
            {
                branch.OpeningDate = updatedExact;
            }
            else if (DateTime.TryParse(dto.OpeningDate, out var updatedFallback))
            {
                branch.OpeningDate = updatedFallback;
            }
            else
            {
                _logger.LogWarning("UpdateBranchAsync: Invalid OpeningDate '{OpeningDate}' ignored", dto.OpeningDate);
            }
        }

        branch.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetBranchAsync(branchId);
    }

    public async Task<bool> DeleteBranchAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.Users)
            .Include(b => b.SentTransfers)
            .Include(b => b.ReceivedTransfers)
            .FirstOrDefaultAsync(b => b.Id == branchId);

        if (branch == null)
        {
            return false;
        }

        // Check if branch has active employees or transfers
        if (branch.Users.Any() || branch.SentTransfers.Any(t => t.Status == TransferStatus.Pending || t.Status == TransferStatus.Approved) || branch.ReceivedTransfers.Any(t => t.Status == TransferStatus.Pending || t.Status == TransferStatus.Approved))
        {
            throw new InvalidOperationException("Cannot delete branch with active employees or pending transfers");
        }

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<List<BranchDto>> GetActiveBranchesAsync()
    {
        var branches = await _context.Branches
            .Where(b => b.IsActive)
            .Include(b => b.Users)
            .OrderBy(b => b.Name)
            .ToListAsync();

        return branches.Select(MapToDto).ToList();
    }

    public async Task<bool> AssignEmployeeToBranchAsync(int branchId, string employeeId)
    {
        var branch = await _context.Branches
            .Include(b => b.Users)
            .FirstOrDefaultAsync(b => b.Id == branchId);

        if (branch == null)
        {
            throw new KeyNotFoundException("Branch not found");
        }

        var employee = await _context.Users.FindAsync(employeeId);
        if (employee == null)
        {
            throw new KeyNotFoundException("Employee not found");
        }

        // Check if branch is at capacity
        if (branch.Users.Count >= branch.MaxEmployees)
        {
            throw new InvalidOperationException("Branch is at maximum employee capacity");
        }

        // Check if employee is already assigned to this branch
        if (branch.Users.Any(e => e.Id == employeeId))
        {
            return true; // Already assigned
        }

        // Remove from previous branch if assigned
        var previousBranch = await _context.Branches
            .Include(b => b.Users)
            .FirstOrDefaultAsync(b => b.Users.Any(e => e.Id == employeeId));

        if (previousBranch != null)
        {
            previousBranch.Users.Remove(employee);
        }

        branch.Users.Add(employee);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RemoveEmployeeFromBranchAsync(int branchId, string employeeId)
    {
        var branch = await _context.Branches
            .Include(b => b.Users)
            .FirstOrDefaultAsync(b => b.Id == branchId);

        if (branch == null)
        {
            return false;
        }

        var employee = branch.Users.FirstOrDefault(e => e.Id == employeeId);
        if (employee == null)
        {
            return false;
        }

        branch.Users.Remove(employee);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<List<string>> GetBranchEmployeesAsync(int branchId)
    {
        var branch = await _context.Branches
            .Include(b => b.Users)
            .FirstOrDefaultAsync(b => b.Id == branchId);

        if (branch == null)
        {
            throw new KeyNotFoundException("Branch not found");
        }

        return branch.Users.Select(e => e.Id).ToList();
    }

    private static string GenerateBranchCode(string branchName)
    {
        // Generate a simple branch code from the first 3 letters of the name
        var code = branchName.Replace(" ", "").ToUpper().Substring(0, Math.Min(3, branchName.Length));
        return $"{code}{DateTime.Now:yyMM}";
    }

    private static BranchDto MapToDto(Branch branch)
    {
        return new BranchDto
        {
            Id = branch.Id,
            Code = branch.Code ?? string.Empty,
            Name = branch.Name,
            Address = branch.Address,
            Commune = branch.Commune ?? string.Empty,
            Department = branch.Department ?? string.Empty,
            Phones = branch.Phones ?? new List<string>(),
            Email = branch.Email ?? string.Empty,
            OpeningDate = branch.OpeningDate.ToString("yyyy-MM-dd"),
            ManagerId = branch.ManagerId,
            ManagerName = branch.Manager != null ? $"{branch.Manager.FirstName ?? ""} {branch.Manager.LastName ?? ""}".Trim() : branch.ManagerName,
            MaxEmployees = branch.MaxEmployees,
            Status = branch.IsActive ? "Active" : "Inactive",
            Limits = new BranchLimitsDto
            {
                DailyWithdrawalLimit = branch.DailyWithdrawalLimit,
                DailyDepositLimit = branch.DailyDepositLimit,
                MaxLocalCreditApproval = branch.MaxLocalCreditApproval,
                MinCashReserveHTG = branch.MinCashReserveHTG,
                MinCashReserveUSD = branch.MinCashReserveUSD
            },
            OperatingHours = new OperatingHoursDto
            {
                // Use proper TimeSpan format tokens (hh, mm) and safe fallback
                OpenTime = SafeFormatTime(branch.OpenTime),
                CloseTime = SafeFormatTime(branch.CloseTime),
                ClosedDays = branch.ClosedDays ?? new List<int>()
            },
            CreatedAt = branch.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            UpdatedAt = branch.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };
    }

    private static string SafeFormatTime(TimeSpan time)
    {
        try
        {
            // Correct custom TimeSpan format pattern
            return time.ToString("hh\\:mm");
        }
        catch
        {
            return "08:00"; // fallback
        }
    }
}