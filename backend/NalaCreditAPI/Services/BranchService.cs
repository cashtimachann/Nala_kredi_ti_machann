using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using Microsoft.EntityFrameworkCore;

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
            OpeningDate = DateTime.Parse(dto.OpeningDate),
            ManagerId = dto.ManagerId,
            MaxEmployees = dto.MaxEmployees,
            PrimaryCurrency = Currency.HTG, // Default
            AcceptsUSD = true,
            AcceptsHTG = true,
            DailyTransactionLimit = dto.Limits.DailyDepositLimit,
            CashLimit = dto.Limits.MinCashReserveHTG,
            OpenTime = TimeSpan.Parse(dto.OperatingHours.OpenTime),
            CloseTime = TimeSpan.Parse(dto.OperatingHours.CloseTime),
            ClosedDays = dto.OperatingHours.ClosedDays ?? new List<int>(),
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
            branch.Department = dto.Department;

        if (dto.Phones != null)
            branch.Phones = dto.Phones;

        if (!string.IsNullOrEmpty(dto.Email))
            branch.Email = dto.Email;

        if (!string.IsNullOrEmpty(dto.ManagerId))
            branch.ManagerId = dto.ManagerId;

        if (!string.IsNullOrEmpty(dto.Status))
            branch.IsActive = dto.Status == "Active";

        if (!string.IsNullOrEmpty(dto.OperatingHours.OpenTime))
            branch.OpenTime = TimeSpan.Parse(dto.OperatingHours.OpenTime);

        if (!string.IsNullOrEmpty(dto.OperatingHours.CloseTime))
            branch.CloseTime = TimeSpan.Parse(dto.OperatingHours.CloseTime);

        if (dto.Limits.MaxLocalCreditApproval > 0)
            branch.MaxLocalCreditApproval = dto.Limits.MaxLocalCreditApproval;

        if (dto.MaxEmployees > 0)
            branch.MaxEmployees = dto.MaxEmployees;

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
            Phones = branch.Phones,
            Email = branch.Email ?? string.Empty,
            OpeningDate = branch.OpeningDate.ToString("yyyy-MM-dd"),
            ManagerId = branch.ManagerId,
            ManagerName = branch.ManagerName,
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
                OpenTime = branch.OpenTime.ToString(@"hh\:mm"),
                CloseTime = branch.CloseTime.ToString(@"hh\:mm"),
                ClosedDays = branch.ClosedDays
            },
            CreatedAt = branch.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            UpdatedAt = branch.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };
    }
}