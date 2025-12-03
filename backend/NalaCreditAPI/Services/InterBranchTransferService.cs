using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace NalaCreditAPI.Services;

public interface IInterBranchTransferService
{
    Task<InterBranchTransferDto> CreateTransferAsync(CreateInterBranchTransferDto dto, int fromBranchId, string requestedBy);
    Task<InterBranchTransferDto> GetTransferAsync(Guid transferId);
    Task<List<InterBranchTransferDto>> GetTransfersAsync(InterBranchTransferSearchDto searchDto);
    Task<InterBranchTransferDto> ApproveTransferAsync(Guid transferId, string approvedBy);
    Task<InterBranchTransferDto> RejectTransferAsync(Guid transferId, string rejectedBy, string reason);
    Task<InterBranchTransferDto> DispatchTransferAsync(Guid transferId, DispatchInterBranchTransferDto dto, string dispatchedBy);
    Task<InterBranchTransferDto> ProcessTransferAsync(Guid transferId, ProcessInterBranchTransferDto dto, string processedBy);
    Task<InterBranchTransferDto> CancelTransferAsync(Guid transferId, string cancelledBy, string reason);
    Task<ConsolidatedTransferReportDto> GetConsolidatedTransferReportAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<BranchTransferSummaryDto> GetBranchTransferSummaryAsync(int branchId, DateTime? startDate = null, DateTime? endDate = null);
    Task<List<InterBranchTransferLogDto>> GetTransferLogsAsync(Guid transferId);
}

public class InterBranchTransferService : IInterBranchTransferService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<InterBranchTransferService> _logger;

    public InterBranchTransferService(
        ApplicationDbContext context,
        ILogger<InterBranchTransferService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<InterBranchTransferDto> CreateTransferAsync(CreateInterBranchTransferDto dto, int fromBranchId, string requestedBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            // Validate branches
            var fromBranch = await _context.Branches.FindAsync(fromBranchId);
            var toBranch = await _context.Branches.FindAsync(dto.ToBranchId);
            if (fromBranch == null || toBranch == null)
            {
                throw new ArgumentException("Une ou plusieurs succursales n'existent pas");
            }

            if (!fromBranch.IsActive || !toBranch.IsActive)
            {
                throw new ArgumentException("Les succursales doivent être actives");
            }

            if (dto.ToBranchId == fromBranchId)
            {
                throw new ArgumentException("La succursale source et destination doivent être différentes");
            }

            // Validate currency acceptance at both branches
            var currency = (ClientCurrency)dto.Currency;
            if (currency == ClientCurrency.USD)
            {
                if (!(fromBranch.AcceptsUSD && toBranch.AcceptsUSD))
                    throw new ArgumentException("Les succursales doivent accepter USD pour ce transfert");
            }
            else if (currency == ClientCurrency.HTG)
            {
                if (!(fromBranch.AcceptsHTG && toBranch.AcceptsHTG))
                    throw new ArgumentException("Les succursales doivent accepter HTG pour ce transfert");
            }

            // Generate transfer number
            var transferNumber = await GenerateTransferNumberAsync();

            // Calculate converted amount if exchange rate provided
            decimal convertedAmount = dto.Amount;
            if (dto.ExchangeRate.HasValue)
            {
                if (dto.ExchangeRate.Value <= 0)
                    throw new ArgumentException("Le taux de change doit être supérieur à 0");
                if (dto.ExchangeRate.Value != 1.0m)
                {
                    convertedAmount = dto.Amount * dto.ExchangeRate.Value;
                }
            }

            var transfer = new InterBranchTransfer
            {
                TransferNumber = transferNumber,
                FromBranchId = fromBranchId,
                ToBranchId = dto.ToBranchId,
                FromBranchName = fromBranch.Name,
                ToBranchName = toBranch.Name,
                Currency = (ClientCurrency)dto.Currency,
                Amount = dto.Amount,
                ExchangeRate = dto.ExchangeRate ?? 1.0m,
                ConvertedAmount = convertedAmount,
                Reason = dto.Reason,
                Notes = dto.Notes,
                RequestedBy = requestedBy,
                Status = TransferStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.InterBranchTransfers.Add(transfer);

            // Log the creation
            await LogTransferActionAsync(transfer.Id, "Created", $"Transfer created by {requestedBy}", requestedBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await MapToDtoAsync(transfer);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error creating inter-branch transfer");
            throw;
        }
    }

    public async Task<InterBranchTransferDto> GetTransferAsync(Guid transferId)
    {
        var transfer = await _context.InterBranchTransfers
            .Include(t => t.FromBranch)
            .Include(t => t.ToBranch)
            .FirstOrDefaultAsync(t => t.Id == transferId);

        if (transfer == null)
        {
            throw new KeyNotFoundException("Transfer not found");
        }

        return await MapToDtoAsync(transfer);
    }

    public async Task<List<InterBranchTransferDto>> GetTransfersAsync(InterBranchTransferSearchDto searchDto)
    {
        var query = _context.InterBranchTransfers
            .Include(t => t.FromBranch)
            .Include(t => t.ToBranch)
            .AsQueryable();

        if (searchDto.FromBranchId.HasValue)
        {
            query = query.Where(t => t.FromBranchId == searchDto.FromBranchId.Value);
        }

        if (searchDto.ToBranchId.HasValue)
        {
            query = query.Where(t => t.ToBranchId == searchDto.ToBranchId.Value);
        }

        if (searchDto.Currency.HasValue)
        {
            query = query.Where(t => t.Currency == (ClientCurrency)searchDto.Currency.Value);
        }

        if (searchDto.Status.HasValue)
        {
            query = query.Where(t => t.Status == (TransferStatus)searchDto.Status.Value);
        }

        if (!string.IsNullOrEmpty(searchDto.RequestedBy))
        {
            query = query.Where(t => t.RequestedBy.Contains(searchDto.RequestedBy));
        }

        if (searchDto.StartDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt >= searchDto.StartDate.Value);
        }

        if (searchDto.EndDate.HasValue)
        {
            query = query.Where(t => t.CreatedAt <= searchDto.EndDate.Value);
        }

        query = query.OrderByDescending(t => t.CreatedAt);

        if (searchDto.Page > 0 && searchDto.PageSize > 0)
        {
            query = query.Skip((searchDto.Page - 1) * searchDto.PageSize).Take(searchDto.PageSize);
        }

        var transfers = await query.ToListAsync();
        var result = new List<InterBranchTransferDto>();

        foreach (var transfer in transfers)
        {
            result.Add(await MapToDtoAsync(transfer));
        }

        return result;
    }

    public async Task<InterBranchTransferDto> ApproveTransferAsync(Guid transferId, string approvedBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var transfer = await _context.InterBranchTransfers.FindAsync(transferId);
            if (transfer == null)
            {
                throw new KeyNotFoundException("Transfer not found");
            }

            if (transfer.Status != TransferStatus.Pending)
            {
                throw new InvalidOperationException("Only pending transfers can be approved");
            }

            transfer.Status = TransferStatus.Approved;
            transfer.ApprovedBy = approvedBy;
            transfer.ApprovedAt = DateTime.UtcNow;
            transfer.UpdatedAt = DateTime.UtcNow;

            await LogTransferActionAsync(transferId, "Approved", $"Transfer approved by {approvedBy}", approvedBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await MapToDtoAsync(transfer);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error approving transfer {TransferId}", transferId);
            throw;
        }
    }

    public async Task<InterBranchTransferDto> RejectTransferAsync(Guid transferId, string rejectedBy, string reason)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var transfer = await _context.InterBranchTransfers.FindAsync(transferId);
            if (transfer == null)
            {
                throw new KeyNotFoundException("Transfer not found");
            }

            if (transfer.Status != TransferStatus.Pending)
            {
                throw new InvalidOperationException("Only pending transfers can be rejected");
            }

            transfer.Status = TransferStatus.Rejected;
            transfer.RejectedBy = rejectedBy;
            transfer.RejectionReason = reason;
            transfer.RejectedAt = DateTime.UtcNow;
            transfer.UpdatedAt = DateTime.UtcNow;

            await LogTransferActionAsync(transferId, "Rejected", $"Transfer rejected by {rejectedBy}: {reason}", rejectedBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await MapToDtoAsync(transfer);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error rejecting transfer {TransferId}", transferId);
            throw;
        }
    }

    public async Task<InterBranchTransferDto> DispatchTransferAsync(Guid transferId, DispatchInterBranchTransferDto dto, string dispatchedBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var transfer = await _context.InterBranchTransfers.FindAsync(transferId);
            if (transfer == null)
            {
                throw new KeyNotFoundException("Transfer not found");
            }

            if (transfer.Status != TransferStatus.Approved)
            {
                throw new InvalidOperationException("Only approved transfers can be dispatched");
            }

            transfer.Status = TransferStatus.InTransit;
            transfer.ReferenceNumber = dto.ReferenceNumber ?? transfer.ReferenceNumber;
            transfer.TrackingNumber = dto.TrackingNumber ?? transfer.TrackingNumber;
            transfer.Notes = dto.Notes ?? transfer.Notes;
            transfer.UpdatedAt = DateTime.UtcNow;

            await LogTransferActionAsync(transferId, "Dispatched", $"Transfer dispatched by {dispatchedBy}", dispatchedBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await MapToDtoAsync(transfer);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error dispatching transfer {TransferId}", transferId);
            throw;
        }
    }

    public async Task<InterBranchTransferDto> ProcessTransferAsync(Guid transferId, ProcessInterBranchTransferDto dto, string processedBy)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var transfer = await _context.InterBranchTransfers.FindAsync(transferId);
            if (transfer == null)
            {
                throw new KeyNotFoundException("Transfer not found");
            }

            if (transfer.Status != TransferStatus.Approved && transfer.Status != TransferStatus.InTransit)
            {
                throw new InvalidOperationException("Only approved or in-transit transfers can be processed");
            }

            transfer.Status = TransferStatus.Completed;
            transfer.ProcessedBy = processedBy;
            transfer.ProcessedAt = DateTime.UtcNow;
            transfer.ReferenceNumber = dto.ReferenceNumber;
            transfer.TrackingNumber = dto.TrackingNumber;
            transfer.UpdatedAt = DateTime.UtcNow;

            await LogTransferActionAsync(transferId, "Processed", $"Transfer processed by {processedBy}", processedBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await MapToDtoAsync(transfer);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error processing transfer {TransferId}", transferId);
            throw;
        }
    }

    public async Task<InterBranchTransferDto> CancelTransferAsync(Guid transferId, string cancelledBy, string reason)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var transfer = await _context.InterBranchTransfers.FindAsync(transferId);
            if (transfer == null)
            {
                throw new KeyNotFoundException("Transfer not found");
            }

            if (transfer.Status == TransferStatus.Completed || transfer.Status == TransferStatus.Cancelled)
            {
                throw new InvalidOperationException("Cannot cancel completed or already cancelled transfers");
            }

            transfer.Status = TransferStatus.Cancelled;
            transfer.UpdatedAt = DateTime.UtcNow;

            await LogTransferActionAsync(transferId, "Cancelled", $"Transfer cancelled by {cancelledBy}: {reason}", cancelledBy);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return await MapToDtoAsync(transfer);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error cancelling transfer {TransferId}", transferId);
            throw;
        }
    }

    public async Task<ConsolidatedTransferReportDto> GetConsolidatedTransferReportAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
        var end = endDate ?? DateTime.UtcNow;

        var transfers = await _context.InterBranchTransfers
            .Where(t => t.CreatedAt >= start && t.CreatedAt <= end)
            .Include(t => t.FromBranch)
            .Include(t => t.ToBranch)
            .ToListAsync();

        var branchSummaries = transfers
            .GroupBy(t => t.FromBranchId)
            .Select(g => new BranchTransferSummaryDto
            {
                BranchId = g.Key,
                BranchName = g.First().FromBranchName,
                TotalSent = g.Sum(t => t.ConvertedAmount),
                TotalReceived = transfers
                    .Where(t => t.ToBranchId == g.Key)
                    .Sum(t => t.ConvertedAmount),
                // per-currency totals
                TotalSentHTG = g.Where(t => t.Currency == ClientCurrency.HTG).Sum(t => t.Amount),
                TotalSentUSD = g.Where(t => t.Currency == ClientCurrency.USD).Sum(t => t.Amount),
                TotalReceivedHTG = transfers.Where(t => t.ToBranchId == g.Key && t.Currency == ClientCurrency.HTG).Sum(t => t.Amount),
                TotalReceivedUSD = transfers.Where(t => t.ToBranchId == g.Key && t.Currency == ClientCurrency.USD).Sum(t => t.Amount),
                PendingTransfers = g.Count(t => t.Status == TransferStatus.Pending),
                CompletedTransfers = g.Count(t => t.Status == TransferStatus.Completed),
                LastTransferDate = g.Max(t => t.CreatedAt)
            })
            .ToList();

        return new ConsolidatedTransferReportDto
        {
            BranchSummaries = branchSummaries,
            TotalSystemTransfers = transfers.Sum(t => t.ConvertedAmount),
            TotalActiveTransfers = transfers.Count(t => t.Status == TransferStatus.Pending || t.Status == TransferStatus.Approved || t.Status == TransferStatus.InTransit),
            ReportGeneratedAt = DateTime.UtcNow
        };
    }

    public async Task<BranchTransferSummaryDto> GetBranchTransferSummaryAsync(int branchId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var start = startDate ?? DateTime.MinValue;
        var end = endDate ?? DateTime.UtcNow;

        var transfers = await _context.InterBranchTransfers
            .Where(t => t.CreatedAt >= start && t.CreatedAt <= end)
            .Include(t => t.FromBranch)
            .Include(t => t.ToBranch)
            .ToListAsync();

        var sent = transfers.Where(t => t.FromBranchId == branchId).ToList();
        var received = transfers.Where(t => t.ToBranchId == branchId).ToList();

        if (!sent.Any() && !received.Any())
        {
            // No transfers found for branch within period - return empty summary with BranchName if possible
            var branch = await _context.Branches.FindAsync(branchId);
            if (branch == null)
                throw new KeyNotFoundException("Branch not found");

            return new BranchTransferSummaryDto
            {
                BranchId = branchId,
                BranchName = branch.Name,
                TotalSent = 0m,
                TotalReceived = 0m,
                PendingTransfers = 0,
                CompletedTransfers = 0,
                LastTransferDate = DateTime.MinValue
            };
        }

        var totalSent = sent.Sum(t => t.ConvertedAmount);
        var totalReceived = received.Sum(t => t.ConvertedAmount);
        // Per-currency totals
        var totalSentHTG = sent.Where(t => t.Currency == ClientCurrency.HTG).Sum(t => t.Amount);
        var totalSentUSD = sent.Where(t => t.Currency == ClientCurrency.USD).Sum(t => t.Amount);
        var totalReceivedHTG = received.Where(t => t.Currency == ClientCurrency.HTG).Sum(t => t.Amount);
        var totalReceivedUSD = received.Where(t => t.Currency == ClientCurrency.USD).Sum(t => t.Amount);
        var pending = sent.Count(t => t.Status == TransferStatus.Pending) + received.Count(t => t.Status == TransferStatus.Pending);
        var completed = sent.Count(t => t.Status == TransferStatus.Completed) + received.Count(t => t.Status == TransferStatus.Completed);
        var lastDate = (sent.Concat(received)).Max(t => t.CreatedAt);

        var name = sent.FirstOrDefault()?.FromBranchName ?? received.FirstOrDefault()?.ToBranchName ?? (await _context.Branches.FindAsync(branchId))?.Name ?? string.Empty;

        return new BranchTransferSummaryDto
        {
            BranchId = branchId,
            BranchName = name,
            TotalSent = totalSent,
            TotalReceived = totalReceived,
            TotalSentHTG = totalSentHTG,
            TotalSentUSD = totalSentUSD,
            TotalReceivedHTG = totalReceivedHTG,
            TotalReceivedUSD = totalReceivedUSD,
            PendingTransfers = pending,
            CompletedTransfers = completed,
            LastTransferDate = lastDate
        };
    }

    public async Task<List<InterBranchTransferLogDto>> GetTransferLogsAsync(Guid transferId)
    {
        var logs = await _context.InterBranchTransferLogs
            .Where(l => l.TransferId == transferId)
            .OrderByDescending(l => l.PerformedAt)
            .ToListAsync();

        return logs.Select(l => new InterBranchTransferLogDto
        {
            Id = l.Id,
            TransferId = l.TransferId,
            Action = l.Action,
            Description = l.Description,
            PerformedBy = l.PerformedBy,
            PerformedByName = l.PerformedByName,
            PerformedAt = l.PerformedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            OldValue = l.OldValue,
            NewValue = l.NewValue
        }).ToList();
    }

    private async Task<string> GenerateTransferNumberAsync()
    {
        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = await _context.InterBranchTransfers
            .CountAsync(t => t.TransferNumber.StartsWith($"IBT-{today}"));

        return $"IBT-{today}-{(count + 1):D3}";
    }

    private async Task LogTransferActionAsync(Guid transferId, string action, string description, string performedBy)
    {
        var log = new InterBranchTransferLog
        {
            TransferId = transferId,
            Action = action,
            Description = description,
            PerformedBy = performedBy,
            PerformedAt = DateTime.UtcNow
        };

        _context.InterBranchTransferLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    private async Task<InterBranchTransferDto> MapToDtoAsync(InterBranchTransfer transfer)
    {
        // Get user names from database
        string? requestedByName = null;
        string? approvedByName = null;
        string? rejectedByName = null;
        string? processedByName = null;

        if (!string.IsNullOrEmpty(transfer.RequestedBy))
        {
            var requestedUser = await _context.Users.FindAsync(transfer.RequestedBy);
            requestedByName = requestedUser != null ? $"{requestedUser.FirstName} {requestedUser.LastName}" : transfer.RequestedBy;
        }

        if (!string.IsNullOrEmpty(transfer.ApprovedBy))
        {
            var approvedUser = await _context.Users.FindAsync(transfer.ApprovedBy);
            approvedByName = approvedUser != null ? $"{approvedUser.FirstName} {approvedUser.LastName}" : transfer.ApprovedBy;
        }

        if (!string.IsNullOrEmpty(transfer.RejectedBy))
        {
            var rejectedUser = await _context.Users.FindAsync(transfer.RejectedBy);
            rejectedByName = rejectedUser != null ? $"{rejectedUser.FirstName} {rejectedUser.LastName}" : transfer.RejectedBy;
        }

        if (!string.IsNullOrEmpty(transfer.ProcessedBy))
        {
            var processedUser = await _context.Users.FindAsync(transfer.ProcessedBy);
            processedByName = processedUser != null ? $"{processedUser.FirstName} {processedUser.LastName}" : transfer.ProcessedBy;
        }

        var dto = new InterBranchTransferDto
        {
            Id = transfer.Id,
            TransferNumber = transfer.TransferNumber,
            FromBranchId = transfer.FromBranchId,
            FromBranchName = transfer.FromBranchName,
            ToBranchId = transfer.ToBranchId,
            ToBranchName = transfer.ToBranchName,
            Currency = (int)transfer.Currency,
            CurrencyName = transfer.Currency.ToString(),
            Amount = transfer.Amount,
            ExchangeRate = transfer.ExchangeRate,
            ConvertedAmount = transfer.ConvertedAmount,
            Reason = transfer.Reason,
            Notes = transfer.Notes,
            Status = (int)transfer.Status,
            StatusName = transfer.Status.ToString(),
            RequestedBy = transfer.RequestedBy,
            RequestedByName = requestedByName,
            RequestedAt = transfer.RequestedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ApprovedBy = transfer.ApprovedBy,
            ApprovedByName = approvedByName,
            ApprovedAt = transfer.ApprovedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            RejectedBy = transfer.RejectedBy,
            RejectedByName = rejectedByName,
            RejectionReason = transfer.RejectionReason,
            RejectedAt = transfer.RejectedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ProcessedBy = transfer.ProcessedBy,
            ProcessedByName = processedByName,
            ProcessedAt = transfer.ProcessedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ReferenceNumber = transfer.ReferenceNumber,
            TrackingNumber = transfer.TrackingNumber,
            CreatedAt = transfer.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            UpdatedAt = transfer.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
        };
        return dto;
    }
}