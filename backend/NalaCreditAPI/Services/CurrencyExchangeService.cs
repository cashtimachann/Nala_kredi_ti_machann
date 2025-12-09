using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using NalaCreditAPI.Utilities;

namespace NalaCreditAPI.Services
{
    public interface ICurrencyExchangeService
    {
        // Exchange Rate Management
        Task<CurrencyExchangeRateDto> CreateExchangeRateAsync(CreateExchangeRateDto dto, string createdBy);
        Task<CurrencyExchangeRateDto> UpdateExchangeRateAsync(Guid rateId, UpdateExchangeRateDto dto, string updatedBy);
        Task<CurrencyExchangeRateDto> GetCurrentExchangeRateAsync(CurrencyType baseCurrency, CurrencyType targetCurrency);
        Task<List<CurrencyExchangeRateDto>> GetExchangeRatesAsync(ExchangeRateSearchDto searchDto);
        Task<bool> DeactivateExchangeRateAsync(Guid rateId, string updatedBy);
        Task<bool> DeleteExchangeRateAsync(Guid rateId);

        // Exchange Calculations
        Task<ExchangeCalculationResultDto> CalculateExchangeAsync(ExchangeCalculationDto dto, Guid branchId);

        // Exchange Transactions
        Task<ExchangeTransactionDto> ProcessExchangeTransactionAsync(CreateExchangeTransactionDto dto, Guid branchId, string processedBy);
        Task<ExchangeTransactionDto> GetExchangeTransactionAsync(Guid transactionId);
        Task<List<ExchangeTransactionDto>> GetExchangeTransactionsAsync(ExchangeTransactionSearchDto searchDto);
        Task<ExchangeTransactionDto> CancelExchangeTransactionAsync(Guid transactionId, string cancelledBy, string reason);
        Task<string> PrintReceiptAsync(Guid transactionId);

        // Currency Reserve Management
        Task<CurrencyReserveDto> GetCurrencyReserveAsync(Guid branchId, CurrencyType currency);
        Task<List<CurrencyReserveDto>> GetBranchCurrencyReservesAsync(Guid branchId);
        Task<CurrencyReserveDto> UpdateCurrencyReserveAsync(Guid reserveId, UpdateCurrencyReserveDto dto, string updatedBy);
        Task<CurrencyMovementDto> AddCurrencyMovementAsync(CreateCurrencyMovementDto dto, string processedBy);
        Task<List<CurrencyMovementDto>> GetCurrencyMovementsAsync(Guid reserveId, DateTime? fromDate = null, DateTime? toDate = null);

        // Reports
        Task<CurrencyExchangeSummaryDto> GetExchangeSummaryAsync(Guid branchId, DateTime date);
        Task<List<ExchangeTransactionDto>> GetDailyExchangeReportAsync(Guid branchId, DateTime date);
    }

    public class CurrencyExchangeService : ICurrencyExchangeService
    {
        private readonly ApplicationDbContext _context;
        private const decimal DefaultCommissionRate = 0.005m; // 0.5%
        private static readonly ConcurrentDictionary<Guid, (int LegacyId, string BranchName)> BranchContextCache = new();
        private static readonly ConcurrentDictionary<Guid, BranchSummaryCacheEntry> BranchSummaryCache = new();
        private static readonly TimeSpan BranchSummaryCacheDuration = TimeSpan.FromSeconds(30);

        public CurrencyExchangeService(ApplicationDbContext context)
        {
            _context = context;
        }

        private sealed class BranchSummaryCacheEntry
        {
            public BranchFinancialSummaryDto Summary { get; init; } = null!;
            public DateTime CachedAt { get; init; }
        }

        public async Task<CurrencyExchangeRateDto> CreateExchangeRateAsync(CreateExchangeRateDto dto, string createdBy)
        {
            // Validate that selling rate is higher than buying rate
            if (dto.SellingRate <= dto.BuyingRate)
            {
                throw new InvalidOperationException("Selling rate must be higher than buying rate");
            }

            // Deactivate existing active rates for the same currency pair
            var existingRates = await _context.CurrencyExchangeRates
                .Where(r => r.BaseCurrency == dto.BaseCurrency &&
                           r.TargetCurrency == dto.TargetCurrency &&
                           r.IsActive)
                .ToListAsync();

            foreach (var rate in existingRates)
            {
                rate.IsActive = false;
                rate.ExpiryDate = DateTime.Now;
                rate.UpdatedAt = DateTime.Now;
                rate.UpdatedBy = createdBy;
            }

            var exchangeRate = new CurrencyExchangeRate
            {
                Id = Guid.NewGuid(),
                BaseCurrency = dto.BaseCurrency,
                TargetCurrency = dto.TargetCurrency,
                BuyingRate = dto.BuyingRate,
                SellingRate = dto.SellingRate,
                EffectiveDate = dto.EffectiveDate,
                ExpiryDate = dto.ExpiryDate,
                UpdateMethod = dto.UpdateMethod,
                IsActive = true,
                Notes = dto.Notes,
                CreatedBy = createdBy,
                UpdatedBy = createdBy,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.CurrencyExchangeRates.Add(exchangeRate);
            await _context.SaveChangesAsync();

            return MapExchangeRateToDto(exchangeRate);
        }

        public async Task<CurrencyExchangeRateDto> UpdateExchangeRateAsync(Guid rateId, UpdateExchangeRateDto dto, string updatedBy)
        {
            var exchangeRate = await _context.CurrencyExchangeRates.FindAsync(rateId);
            if (exchangeRate == null)
                throw new InvalidOperationException($"Exchange rate with ID {rateId} not found");

            if (!exchangeRate.IsActive)
                throw new InvalidOperationException("Cannot update inactive exchange rate");

            // Validate that selling rate is higher than buying rate
            if (dto.SellingRate <= dto.BuyingRate)
            {
                throw new InvalidOperationException("Selling rate must be higher than buying rate");
            }

            exchangeRate.BuyingRate = dto.BuyingRate;
            exchangeRate.SellingRate = dto.SellingRate;
            exchangeRate.ExpiryDate = dto.ExpiryDate;
            exchangeRate.Notes = dto.Notes;
            exchangeRate.UpdatedBy = updatedBy;
            exchangeRate.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapExchangeRateToDto(exchangeRate);
        }

        public async Task<CurrencyExchangeRateDto> GetCurrentExchangeRateAsync(CurrencyType baseCurrency, CurrencyType targetCurrency)
        {
            var exchangeRate = await _context.CurrencyExchangeRates
                .Where(r => r.BaseCurrency == baseCurrency &&
                           r.TargetCurrency == targetCurrency &&
                           r.IsActive &&
                           r.EffectiveDate <= DateTime.Now &&
                           (r.ExpiryDate == null || r.ExpiryDate > DateTime.Now))
                .OrderByDescending(r => r.EffectiveDate)
                .FirstOrDefaultAsync();

            if (exchangeRate == null)
                throw new InvalidOperationException($"No active exchange rate found for {baseCurrency} to {targetCurrency}");

            return MapExchangeRateToDto(exchangeRate);
        }

        public async Task<List<CurrencyExchangeRateDto>> GetExchangeRatesAsync(ExchangeRateSearchDto searchDto)
        {
            var query = _context.CurrencyExchangeRates.AsQueryable();

            if (searchDto.BaseCurrency.HasValue)
                query = query.Where(r => r.BaseCurrency == searchDto.BaseCurrency.Value);

            if (searchDto.TargetCurrency.HasValue)
                query = query.Where(r => r.TargetCurrency == searchDto.TargetCurrency.Value);

            if (searchDto.IsActive.HasValue)
                query = query.Where(r => r.IsActive == searchDto.IsActive.Value);

            if (searchDto.EffectiveDateFrom.HasValue)
                query = query.Where(r => r.EffectiveDate >= searchDto.EffectiveDateFrom.Value);

            if (searchDto.EffectiveDateTo.HasValue)
                query = query.Where(r => r.EffectiveDate <= searchDto.EffectiveDateTo.Value);

            var rates = await query
                .OrderByDescending(r => r.EffectiveDate)
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            return rates.Select(MapExchangeRateToDto).ToList();
        }

        public async Task<bool> DeactivateExchangeRateAsync(Guid rateId, string updatedBy)
        {
            var exchangeRate = await _context.CurrencyExchangeRates.FindAsync(rateId);
            if (exchangeRate == null)
                return false;

            exchangeRate.IsActive = false;
            exchangeRate.ExpiryDate = DateTime.Now;
            exchangeRate.UpdatedBy = updatedBy;
            exchangeRate.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteExchangeRateAsync(Guid rateId)
        {
            var exchangeRate = await _context.CurrencyExchangeRates
                .Include(r => r.Transactions)
                .FirstOrDefaultAsync(r => r.Id == rateId);

            if (exchangeRate == null)
                return false;

            if (exchangeRate.Transactions.Any())
                throw new InvalidOperationException("Cannot delete exchange rate with associated transactions");

            _context.CurrencyExchangeRates.Remove(exchangeRate);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<ExchangeCalculationResultDto> CalculateExchangeAsync(ExchangeCalculationDto dto, Guid branchId)
        {
            var result = new ExchangeCalculationResultDto
            {
                ExchangeType = dto.ExchangeType,
                ExchangeTypeName = dto.ExchangeType.ToString(),
                FromAmount = dto.Amount,
                CommissionRate = DefaultCommissionRate
            };

            try
            {
                if (branchId == Guid.Empty)
                {
                    result.IsValid = false;
                    result.ErrorMessage = "Succursale requise pour calculer la transaction.";
                    return result;
                }

                var (legacyBranchId, branchName) = await ResolveBranchContextAsync(branchId);

                // Determine currencies based on exchange type
                if (dto.ExchangeType == ExchangeType.Purchase) // HTG → USD
                {
                    result.FromCurrency = CurrencyType.HTG;
                    result.FromCurrencyName = "HTG";
                    result.ToCurrency = CurrencyType.USD;
                    result.ToCurrencyName = "USD";
                }
                else // USD → HTG
                {
                    result.FromCurrency = CurrencyType.USD;
                    result.FromCurrencyName = "USD";
                    result.ToCurrency = CurrencyType.HTG;
                    result.ToCurrencyName = "HTG";
                }

                // Get current exchange rate
                var exchangeRate = await GetCurrentExchangeRateAsync(CurrencyType.HTG, CurrencyType.USD);

                if (dto.ExchangeType == ExchangeType.Purchase)
                {
                    // Client wants to buy USD with HTG
                    result.ExchangeRate = exchangeRate.BuyingRate;
                    result.ToAmount = dto.Amount / exchangeRate.BuyingRate;
                }
                else
                {
                    // Client wants to sell USD for HTG
                    result.ExchangeRate = exchangeRate.SellingRate;
                    result.ToAmount = dto.Amount * exchangeRate.SellingRate;
                }

                // Calculate commission
                result.CommissionAmount = result.ToAmount * DefaultCommissionRate;
                result.NetAmount = result.ToAmount - result.CommissionAmount;

                var summary = await GetBranchFinancialSummaryCachedAsync(branchId, legacyBranchId, branchName);

                var availableBalance = result.ToCurrency == CurrencyType.USD
                    ? summary.BalanceUSD
                    : summary.BalanceHTG;

                result.AvailableBalance = availableBalance;

                if (availableBalance < result.NetAmount)
                {
                    result.IsValid = false;
                    result.ErrorMessage =
                        $"Solde total insuffisant en {result.ToCurrencyName} pour la succursale {branchName}. Disponible: {availableBalance:F2}";
                    return result;
                }

                result.IsValid = true;
            }
            catch (InvalidOperationException ex)
            {
                result.IsValid = false;
                result.ErrorMessage = ex.Message;
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.ErrorMessage = ex.Message;
            }

            return result;
        }

        public async Task<ExchangeTransactionDto> ProcessExchangeTransactionAsync(CreateExchangeTransactionDto dto, Guid branchId, string processedBy)
        {
            // Calculate exchange first
            var calculation = await CalculateExchangeAsync(new ExchangeCalculationDto 
            { 
                ExchangeType = dto.ExchangeType, 
                Amount = dto.Amount 
            }, branchId);

            if (!calculation.IsValid)
                throw new InvalidOperationException(calculation.ErrorMessage);

            // Get current exchange rate
            var currentRate = await GetCurrentExchangeRateAsync(CurrencyType.HTG, CurrencyType.USD);

            // Generate transaction number
            var lastTransaction = await _context.ExchangeTransactions
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            var transactionCount = 1;
            if (lastTransaction != null && !string.IsNullOrEmpty(lastTransaction.TransactionNumber))
            {
                var parts = lastTransaction.TransactionNumber.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out var lastNumber))
                {
                    transactionCount = lastNumber + 1;
                }
            }

            var branchName = await ResolveBranchNameAsync(branchId);

            var transaction = new ExchangeTransaction
            {
                Id = Guid.NewGuid(),
                TransactionNumber = $"EXC-{DateTime.Now:yyyyMMdd}-{transactionCount:D4}",
                BranchId = branchId,
                BranchName = branchName,
                ExchangeRateId = currentRate.Id,
                ExchangeType = dto.ExchangeType,
                FromCurrency = calculation.FromCurrency,
                ToCurrency = calculation.ToCurrency,
                FromAmount = calculation.FromAmount,
                ToAmount = calculation.ToAmount,
                ExchangeRate = calculation.ExchangeRate,
                CommissionAmount = calculation.CommissionAmount,
                CommissionRate = calculation.CommissionRate,
                NetAmount = calculation.NetAmount,
                CustomerName = dto.CustomerName,
                CustomerDocument = dto.CustomerDocument,
                CustomerPhone = dto.CustomerPhone,
                Status = ExchangeTransactionStatus.Completed,
                TransactionDate = DateTime.Now,
                ProcessedBy = processedBy,
                ProcessedByName = processedBy,
                Notes = dto.Notes,
                ReceiptNumber = $"REC-{DateTime.Now:yyyyMMdd}-{transactionCount:D4}",
                ReceiptPrinted = false,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.ExchangeTransactions.Add(transaction);

            // Update currency reserves
            await UpdateReservesForTransactionAsync(branchId, calculation, transaction.Id, processedBy);

            await _context.SaveChangesAsync();

            var persistedRate = await _context.CurrencyExchangeRates.FindAsync(currentRate.Id);
            if (persistedRate == null)
            {
                throw new InvalidOperationException("Currency rate record not found after transaction save.");
            }
            transaction.CurrencyRate = persistedRate;
            return MapExchangeTransactionToDto(transaction);
        }

        public async Task<ExchangeTransactionDto> GetExchangeTransactionAsync(Guid transactionId)
        {
            var transaction = await _context.ExchangeTransactions
                .Include(t => t.CurrencyRate)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null)
                throw new InvalidOperationException($"Exchange transaction with ID {transactionId} not found");

            return MapExchangeTransactionToDto(transaction);
        }

        public async Task<List<ExchangeTransactionDto>> GetExchangeTransactionsAsync(ExchangeTransactionSearchDto searchDto)
        {
            var query = _context.ExchangeTransactions
                .Include(t => t.CurrencyRate)
                .AsQueryable();

            var branchGuid = searchDto.BranchGuid;
            if (branchGuid.HasValue)
                query = query.Where(t => t.BranchId == branchGuid.Value);

            if (searchDto.ExchangeType.HasValue)
                query = query.Where(t => t.ExchangeType == searchDto.ExchangeType.Value);

            if (searchDto.FromCurrency.HasValue)
                query = query.Where(t => t.FromCurrency == searchDto.FromCurrency.Value);

            if (searchDto.ToCurrency.HasValue)
                query = query.Where(t => t.ToCurrency == searchDto.ToCurrency.Value);

            if (searchDto.Status.HasValue)
                query = query.Where(t => t.Status == searchDto.Status.Value);

            if (searchDto.TransactionDateFrom.HasValue)
                query = query.Where(t => t.TransactionDate >= searchDto.TransactionDateFrom.Value);

            if (searchDto.TransactionDateTo.HasValue)
                query = query.Where(t => t.TransactionDate <= searchDto.TransactionDateTo.Value);

            if (!string.IsNullOrWhiteSpace(searchDto.CustomerName))
                query = query.Where(t => t.CustomerName.Contains(searchDto.CustomerName));

            if (!string.IsNullOrWhiteSpace(searchDto.TransactionNumber))
                query = query.Where(t => t.TransactionNumber.Contains(searchDto.TransactionNumber));

            var transactions = await query
                .OrderByDescending(t => t.TransactionDate)
                .Skip((searchDto.Page - 1) * searchDto.PageSize)
                .Take(searchDto.PageSize)
                .ToListAsync();

            return transactions.Select(MapExchangeTransactionToDto).ToList();
        }

        public async Task<ExchangeTransactionDto> CancelExchangeTransactionAsync(Guid transactionId, string cancelledBy, string reason)
        {
            var transaction = await _context.ExchangeTransactions
                .Include(t => t.CurrencyRate)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null)
                throw new InvalidOperationException($"Exchange transaction with ID {transactionId} not found");

            if (transaction.Status != ExchangeTransactionStatus.Completed)
                throw new InvalidOperationException("Only completed transactions can be cancelled");

            // Reverse the currency movements
            await ReverseCurrencyMovementsAsync(transactionId, cancelledBy, reason);

            transaction.Status = ExchangeTransactionStatus.Cancelled;
            transaction.Notes = $"{transaction.Notes} | CANCELLED: {reason}";
            transaction.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapExchangeTransactionToDto(transaction);
        }

        public async Task<string> PrintReceiptAsync(Guid transactionId)
        {
            var transaction = await GetExchangeTransactionAsync(transactionId);
            
            var receipt = $@"
================================
       NALA KREDI SYSTEM
       CURRENCY EXCHANGE
================================
Receipt #: {transaction.ReceiptNumber}
Transaction #: {transaction.TransactionNumber}
Date: {transaction.TransactionDate:yyyy-MM-dd HH:mm}
Branch: {transaction.BranchName}

Customer: {transaction.CustomerName}
{(!string.IsNullOrEmpty(transaction.CustomerDocument) ? $"Document: {transaction.CustomerDocument}" : "")}
{(!string.IsNullOrEmpty(transaction.CustomerPhone) ? $"Phone: {transaction.CustomerPhone}" : "")}

EXCHANGE DETAILS:
Type: {transaction.ExchangeTypeName}
From: {transaction.FromAmount:F2} {transaction.FromCurrencyName}
Rate: {transaction.ExchangeRate:F6}
To: {transaction.ToAmount:F2} {transaction.ToCurrencyName}
Commission ({transaction.CommissionRate:P2}): {transaction.CommissionAmount:F2} {transaction.ToCurrencyName}
Net Amount: {transaction.NetAmount:F2} {transaction.ToCurrencyName}

Processed by: {transaction.ProcessedByName}
Status: {transaction.StatusName}

================================
Thank you for your business!
================================
";

            // Mark receipt as printed
            var transactionEntity = await _context.ExchangeTransactions.FindAsync(transactionId);
            if (transactionEntity != null)
            {
                transactionEntity.ReceiptPrinted = true;
                transactionEntity.UpdatedAt = DateTime.Now;
                await _context.SaveChangesAsync();
            }

            return receipt;
        }

        public async Task<CurrencyReserveDto> GetCurrencyReserveAsync(Guid branchId, CurrencyType currency)
        {
            var reserve = await _context.CurrencyReserves
                .FirstOrDefaultAsync(r => r.BranchId == branchId && r.Currency == currency);

            if (reserve == null)
            {
                // Create default reserve if it doesn't exist
                var branchName = await ResolveBranchNameAsync(branchId);

                reserve = new CurrencyReserve
                {
                    Id = Guid.NewGuid(),
                    BranchId = branchId,
                    BranchName = branchName,
                    Currency = currency,
                    CurrentBalance = 0,
                    MinimumBalance = currency == CurrencyType.USD ? 1000 : 50000,
                    MaximumBalance = currency == CurrencyType.USD ? 50000 : 2000000,
                    DailyLimit = currency == CurrencyType.USD ? 10000 : 500000,
                    DailyUsed = 0,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    UpdatedBy = "System"
                };

                _context.CurrencyReserves.Add(reserve);
                await _context.SaveChangesAsync();
            }

            return MapCurrencyReserveToDto(reserve);
        }

        public async Task<List<CurrencyReserveDto>> GetBranchCurrencyReservesAsync(Guid branchId)
        {
            var reserves = await _context.CurrencyReserves
                .Where(r => r.BranchId == branchId && r.IsActive)
                .ToListAsync();

            // Ensure both USD and HTG reserves exist
            var currencies = new[] { CurrencyType.USD, CurrencyType.HTG };
            
            foreach (var currency in currencies)
            {
                if (!reserves.Any(r => r.Currency == currency))
                {
                    await GetCurrencyReserveAsync(branchId, currency);
                }
            }

            // Refresh the list after creating missing reserves
            reserves = await _context.CurrencyReserves
                .Where(r => r.BranchId == branchId && r.IsActive)
                .OrderBy(r => r.Currency)
                .ToListAsync();

            return reserves.Select(MapCurrencyReserveToDto).ToList();
        }

        public async Task<CurrencyReserveDto> UpdateCurrencyReserveAsync(Guid reserveId, UpdateCurrencyReserveDto dto, string updatedBy)
        {
            var reserve = await _context.CurrencyReserves.FindAsync(reserveId);
            if (reserve == null)
                throw new InvalidOperationException($"Currency reserve with ID {reserveId} not found");

            if (dto.MaximumBalance <= dto.MinimumBalance)
                throw new InvalidOperationException("Maximum balance must be greater than minimum balance");

            reserve.MinimumBalance = dto.MinimumBalance;
            reserve.MaximumBalance = dto.MaximumBalance;
            reserve.DailyLimit = dto.DailyLimit;
            reserve.Notes = dto.Notes;
            reserve.UpdatedBy = updatedBy;
            reserve.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return MapCurrencyReserveToDto(reserve);
        }

        public async Task<CurrencyMovementDto> AddCurrencyMovementAsync(CreateCurrencyMovementDto dto, string processedBy)
        {
            var reserve = await _context.CurrencyReserves.FindAsync(dto.CurrencyReserveId);
            if (reserve == null)
                throw new InvalidOperationException($"Currency reserve with ID {dto.CurrencyReserveId} not found");

            if (!reserve.IsActive)
                throw new InvalidOperationException("Cannot add movements to inactive currency reserve");

            // Validate movement amount
            if (dto.MovementType == CurrencyMovementType.Deposit && dto.Amount <= 0)
                throw new InvalidOperationException("Deposit amount must be positive");

            if (dto.MovementType == CurrencyMovementType.Restock && dto.Amount <= 0)
                throw new InvalidOperationException("Restock amount must be positive");

            var balanceBefore = reserve.CurrentBalance;
            var balanceAfter = balanceBefore;

            // Calculate new balance based on movement type
            switch (dto.MovementType)
            {
                case CurrencyMovementType.Restock:
                    balanceAfter = balanceBefore + dto.Amount;
                    break;
                case CurrencyMovementType.Deposit:
                    balanceAfter = balanceBefore - dto.Amount;
                    if (balanceAfter < 0)
                        throw new InvalidOperationException("Insufficient balance for deposit");
                    break;
                case CurrencyMovementType.Adjustment:
                    balanceAfter = balanceBefore + dto.Amount;
                    break;
                default:
                    throw new InvalidOperationException($"Movement type {dto.MovementType} not supported for manual movements");
            }

            var movement = new CurrencyMovement
            {
                Id = Guid.NewGuid(),
                CurrencyReserveId = dto.CurrencyReserveId,
                MovementType = dto.MovementType,
                Amount = dto.Amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = balanceAfter,
                Reference = dto.Reference,
                Description = dto.Description,
                Notes = dto.Notes,
                MovementDate = DateTime.Now,
                ProcessedBy = processedBy,
                ProcessedByName = processedBy,
                CreatedAt = DateTime.Now
            };

            // Update reserve balance
            reserve.CurrentBalance = balanceAfter;
            reserve.UpdatedAt = DateTime.Now;
            reserve.UpdatedBy = processedBy;

            if (dto.MovementType == CurrencyMovementType.Restock)
                reserve.LastRestockDate = DateTime.Now;
            else if (dto.MovementType == CurrencyMovementType.Deposit)
                reserve.LastDepositDate = DateTime.Now;

            _context.CurrencyMovements.Add(movement);
            await _context.SaveChangesAsync();

            movement.CurrencyReserve = reserve;
            return MapCurrencyMovementToDto(movement);
        }

        public async Task<List<CurrencyMovementDto>> GetCurrencyMovementsAsync(Guid reserveId, DateTime? fromDate = null, DateTime? toDate = null)
        {
            var query = _context.CurrencyMovements
                .Include(m => m.CurrencyReserve)
                .Where(m => m.CurrencyReserveId == reserveId);

            if (fromDate.HasValue)
                query = query.Where(m => m.MovementDate >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(m => m.MovementDate <= toDate.Value);

            var movements = await query
                .OrderByDescending(m => m.MovementDate)
                .ToListAsync();

            return movements.Select(MapCurrencyMovementToDto).ToList();
        }

        public async Task<CurrencyExchangeSummaryDto> GetExchangeSummaryAsync(Guid branchId, DateTime date)
        {
            var branchName = await ResolveBranchNameAsync(branchId);

            var startOfDay = date.Date;
            var endOfDay = startOfDay.AddDays(1);

            var transactions = await _context.ExchangeTransactions
                .Where(t => t.BranchId == branchId &&
                           t.TransactionDate >= startOfDay &&
                           t.TransactionDate < endOfDay &&
                           t.Status == ExchangeTransactionStatus.Completed)
                .ToListAsync();

            var reserves = await GetBranchCurrencyReservesAsync(branchId);
            var htgReserve = reserves.FirstOrDefault(r => r.Currency == CurrencyType.HTG);
            var usdReserve = reserves.FirstOrDefault(r => r.Currency == CurrencyType.USD);

            return new CurrencyExchangeSummaryDto
            {
                BranchId = branchId,
                BranchName = branchName,
                ReportDate = date,
                HTGBalance = htgReserve?.CurrentBalance ?? 0,
                USDBalance = usdReserve?.CurrentBalance ?? 0,
                TotalTransactions = transactions.Count,
                TotalHTGSold = transactions.Where(t => t.FromCurrency == CurrencyType.HTG).Sum(t => t.FromAmount),
                TotalUSDSold = transactions.Where(t => t.FromCurrency == CurrencyType.USD).Sum(t => t.FromAmount),
                TotalCommissionEarned = transactions.Sum(t => t.CommissionAmount),
                HTGDailyLimit = htgReserve?.DailyLimit ?? 0,
                HTGDailyUsed = htgReserve?.DailyUsed ?? 0,
                USDDailyLimit = usdReserve?.DailyLimit ?? 0,
                USDDailyUsed = usdReserve?.DailyUsed ?? 0
            };
        }

        public async Task<List<ExchangeTransactionDto>> GetDailyExchangeReportAsync(Guid branchId, DateTime date)
        {
            var startOfDay = date.Date;
            var endOfDay = startOfDay.AddDays(1);

            var transactions = await _context.ExchangeTransactions
                .Include(t => t.CurrencyRate)
                .Where(t => t.BranchId == branchId &&
                           t.TransactionDate >= startOfDay &&
                           t.TransactionDate < endOfDay)
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync();

            return transactions.Select(MapExchangeTransactionToDto).ToList();
        }

        private async Task<BranchFinancialSummaryDto> GetBranchFinancialSummaryCachedAsync(Guid branchIntegrationId, int legacyBranchId, string branchName)
        {
            if (BranchSummaryCache.TryGetValue(branchIntegrationId, out var cacheEntry))
            {
                if (DateTime.UtcNow - cacheEntry.CachedAt <= BranchSummaryCacheDuration)
                {
                    return cacheEntry.Summary;
                }
            }

            var summary = await BuildBranchFinancialSummaryAsync(legacyBranchId, branchName);

            BranchSummaryCache[branchIntegrationId] = new BranchSummaryCacheEntry
            {
                Summary = summary,
                CachedAt = DateTime.UtcNow
            };

            return summary;
        }

        private async Task<BranchFinancialSummaryDto> BuildBranchFinancialSummaryAsync(int legacyBranchId, string branchName)
        {
            // Retrieve minimal projections to reduce memory footprint
            var baseTx = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BranchId == legacyBranchId && t.Status == TransactionStatus.Completed)
                .Select(t => new { t.Type, t.Currency, t.Amount, t.CreatedAt })
                .ToListAsync();

            var savingsTx = await _context.SavingsTransactions
                .AsNoTracking()
                .Where(t => t.BranchId == legacyBranchId && t.Status == SavingsTransactionStatus.Completed)
                .Select(t => new { t.Type, t.Currency, t.Amount, t.ProcessedAt })
                .ToListAsync();

            var currentTx = await _context.CurrentAccountTransactions
                .AsNoTracking()
                .Where(t => t.BranchId == legacyBranchId && t.Status == SavingsTransactionStatus.Completed)
                .Select(t => new { t.Type, t.Currency, t.Amount, t.ProcessedAt })
                .ToListAsync();

            var termTx = await _context.TermSavingsTransactions
                .AsNoTracking()
                .Where(t => t.BranchId == legacyBranchId && t.Status == SavingsTransactionStatus.Completed)
                .Select(t => new { t.Type, t.Currency, t.Amount, t.ProcessedAt })
                .ToListAsync();

            var transfers = await _context.InterBranchTransfers
                .AsNoTracking()
                .Where(t => (t.FromBranchId == legacyBranchId || t.ToBranchId == legacyBranchId) && t.Status == TransferStatus.Completed)
                .Select(t => new { t.FromBranchId, t.ToBranchId, t.Currency, t.Amount, t.CreatedAt })
                .ToListAsync();

            bool IsHTG(object currency) => currency switch
            {
                Currency c => c == Currency.HTG,
                SavingsCurrency sc => sc == SavingsCurrency.HTG,
                ClientCurrency cc => cc == ClientCurrency.HTG,
                _ => false
            };

            bool IsUSD(object currency) => currency switch
            {
                Currency c => c == Currency.USD,
                SavingsCurrency sc => sc == SavingsCurrency.USD,
                ClientCurrency cc => cc == ClientCurrency.USD,
                _ => false
            };

            var htgDeposits = 0m
                + baseTx.Where(t => t.Type == TransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                + savingsTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                + currentTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                + termTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsHTG(t.Currency)).Sum(t => t.Amount)
                + transfers.Where(t => t.ToBranchId == legacyBranchId && IsHTG(t.Currency)).Sum(t => t.Amount);

            var htgWithdrawals = 0m
                + baseTx.Where(t => t.Type == TransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                + savingsTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                + currentTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                + termTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsHTG(t.Currency)).Sum(t => t.Amount)
                + transfers.Where(t => t.FromBranchId == legacyBranchId && IsHTG(t.Currency)).Sum(t => t.Amount);

            var usdDeposits = 0m
                + baseTx.Where(t => t.Type == TransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                + savingsTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                + currentTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                + termTx.Where(t => t.Type == SavingsTransactionType.Deposit && IsUSD(t.Currency)).Sum(t => t.Amount)
                + transfers.Where(t => t.ToBranchId == legacyBranchId && IsUSD(t.Currency)).Sum(t => t.Amount);

            var usdWithdrawals = 0m
                + baseTx.Where(t => t.Type == TransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                + savingsTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                + currentTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                + termTx.Where(t => t.Type == SavingsTransactionType.Withdrawal && IsUSD(t.Currency)).Sum(t => t.Amount)
                + transfers.Where(t => t.FromBranchId == legacyBranchId && IsUSD(t.Currency)).Sum(t => t.Amount);

            var totalCount = baseTx.Count + savingsTx.Count + currentTx.Count + termTx.Count + transfers.Count;

            var lastDateCandidates = new List<DateTime>();
            if (baseTx.Any()) lastDateCandidates.Add(baseTx.Max(t => t.CreatedAt));
            if (savingsTx.Any()) lastDateCandidates.Add(savingsTx.Max(t => t.ProcessedAt));
            if (currentTx.Any()) lastDateCandidates.Add(currentTx.Max(t => t.ProcessedAt));
            if (termTx.Any()) lastDateCandidates.Add(termTx.Max(t => t.ProcessedAt));
            if (transfers.Any()) lastDateCandidates.Add(transfers.Max(t => t.CreatedAt));
            var lastDate = lastDateCandidates.Any() ? lastDateCandidates.Max() : DateTime.MinValue;

            return new BranchFinancialSummaryDto
            {
                BranchId = legacyBranchId,
                BranchName = branchName,
                TotalDepositHTG = htgDeposits,
                TotalWithdrawalHTG = htgWithdrawals,
                BalanceHTG = htgDeposits - htgWithdrawals,
                TotalDepositUSD = usdDeposits,
                TotalWithdrawalUSD = usdWithdrawals,
                BalanceUSD = usdDeposits - usdWithdrawals,
                TotalTransactions = totalCount,
                LastTransactionDate = lastDate
            };
        }

        private async Task<(int LegacyBranchId, string BranchName)> ResolveBranchContextAsync(Guid branchIntegrationId)
        {
            if (branchIntegrationId == Guid.Empty)
            {
                throw new InvalidOperationException("Succursale requise pour cette opération.");
            }

            if (BranchContextCache.TryGetValue(branchIntegrationId, out var cachedContext))
            {
                return cachedContext;
            }

            var branches = await _context.Branches
                .AsNoTracking()
                .Select(b => new { b.Id, b.Name })
                .ToListAsync();

            foreach (var branch in branches)
            {
                if (BranchIntegrationHelper.FromLegacyId(branch.Id) == branchIntegrationId)
                {
                    var context = (branch.Id, branch.Name);
                    BranchContextCache[branchIntegrationId] = context;
                    return context;
                }
            }

            throw new InvalidOperationException("Succursale introuvable pour effectuer le calcul.");
        }

        private async Task<string> ResolveBranchNameAsync(Guid branchIntegrationId)
        {
            if (branchIntegrationId == Guid.Empty)
            {
                return "Unknown Branch";
            }

            try
            {
                var (_, branchName) = await ResolveBranchContextAsync(branchIntegrationId);
                return branchName;
            }
            catch
            {
                return "Unknown Branch";
            }
        }

        // Helper methods
        private async Task ReverseCurrencyMovementsAsync(Guid transactionId, string processedBy, string reason)
        {
            var movements = await _context.CurrencyMovements
                .Include(m => m.CurrencyReserve)
                .Where(m => m.ExchangeTransactionId == transactionId)
                .ToListAsync();

            foreach (var originalMovement in movements)
            {
                var reverseMovement = new CurrencyMovement
                {
                    Id = Guid.NewGuid(),
                    CurrencyReserveId = originalMovement.CurrencyReserveId,
                    MovementType = CurrencyMovementType.Adjustment,
                    Amount = -originalMovement.Amount, // Reverse the amount
                    BalanceBefore = originalMovement.CurrencyReserve.CurrentBalance,
                    BalanceAfter = originalMovement.CurrencyReserve.CurrentBalance - originalMovement.Amount,
                    Reference = $"REVERSAL-{originalMovement.Reference}",
                    Description = $"Reversal: {reason}",
                    Notes = $"Reversal of movement {originalMovement.Id}",
                    MovementDate = DateTime.Now,
                    ProcessedBy = processedBy,
                    ProcessedByName = processedBy,
                    CreatedAt = DateTime.Now
                };

                // Update reserve balance
                originalMovement.CurrencyReserve.CurrentBalance -= originalMovement.Amount;
                originalMovement.CurrencyReserve.UpdatedAt = DateTime.Now;
                originalMovement.CurrencyReserve.UpdatedBy = processedBy;

                _context.CurrencyMovements.Add(reverseMovement);
            }
        }

        private async Task UpdateReservesForTransactionAsync(Guid branchId, ExchangeCalculationResultDto calculation, Guid transactionId, string processedBy)
        {
            // Update the currency being given out (decrease)
            var outgoingReserve = await _context.CurrencyReserves
                .FirstOrDefaultAsync(r => r.BranchId == branchId && r.Currency == calculation.ToCurrency);

            if (outgoingReserve != null)
            {
                var outgoingMovement = new CurrencyMovement
                {
                    Id = Guid.NewGuid(),
                    CurrencyReserveId = outgoingReserve.Id,
                    MovementType = CurrencyMovementType.Exchange,
                    Amount = -calculation.NetAmount, // Negative because it's going out
                    BalanceBefore = outgoingReserve.CurrentBalance,
                    BalanceAfter = outgoingReserve.CurrentBalance - calculation.NetAmount,
                    Reference = $"Exchange Transaction",
                    ExchangeTransactionId = transactionId,
                    Description = $"Currency exchange - {calculation.FromCurrencyName} to {calculation.ToCurrencyName}",
                    MovementDate = DateTime.Now,
                    ProcessedBy = processedBy,
                    ProcessedByName = processedBy,
                    CreatedAt = DateTime.Now
                };

                outgoingReserve.CurrentBalance -= calculation.NetAmount;
                outgoingReserve.DailyUsed += calculation.NetAmount;
                outgoingReserve.UpdatedAt = DateTime.Now;
                outgoingReserve.UpdatedBy = processedBy;

                _context.CurrencyMovements.Add(outgoingMovement);
            }

            // Update the currency being received (increase)
            var incomingReserve = await _context.CurrencyReserves
                .FirstOrDefaultAsync(r => r.BranchId == branchId && r.Currency == calculation.FromCurrency);

            if (incomingReserve != null)
            {
                var incomingMovement = new CurrencyMovement
                {
                    Id = Guid.NewGuid(),
                    CurrencyReserveId = incomingReserve.Id,
                    MovementType = CurrencyMovementType.Exchange,
                    Amount = calculation.FromAmount, // Positive because it's coming in
                    BalanceBefore = incomingReserve.CurrentBalance,
                    BalanceAfter = incomingReserve.CurrentBalance + calculation.FromAmount,
                    Reference = $"Exchange Transaction",
                    ExchangeTransactionId = transactionId,
                    Description = $"Currency exchange - {calculation.FromCurrencyName} to {calculation.ToCurrencyName}",
                    MovementDate = DateTime.Now,
                    ProcessedBy = processedBy,
                    ProcessedByName = processedBy,
                    CreatedAt = DateTime.Now
                };

                incomingReserve.CurrentBalance += calculation.FromAmount;
                incomingReserve.UpdatedAt = DateTime.Now;
                incomingReserve.UpdatedBy = processedBy;

                _context.CurrencyMovements.Add(incomingMovement);
            }
        }

        private CurrencyExchangeRateDto MapExchangeRateToDto(CurrencyExchangeRate rate)
        {
            return new CurrencyExchangeRateDto
            {
                Id = rate.Id,
                BaseCurrency = rate.BaseCurrency,
                BaseCurrencyName = rate.BaseCurrency.ToString(),
                TargetCurrency = rate.TargetCurrency,
                TargetCurrencyName = rate.TargetCurrency.ToString(),
                BuyingRate = rate.BuyingRate,
                SellingRate = rate.SellingRate,
                EffectiveDate = rate.EffectiveDate,
                ExpiryDate = rate.ExpiryDate,
                UpdateMethod = rate.UpdateMethod,
                UpdateMethodName = rate.UpdateMethod.ToString(),
                IsActive = rate.IsActive,
                Notes = rate.Notes,
                CreatedBy = rate.CreatedBy,
                UpdatedBy = rate.UpdatedBy,
                CreatedAt = rate.CreatedAt,
                UpdatedAt = rate.UpdatedAt
            };
        }

        private ExchangeTransactionDto MapExchangeTransactionToDto(ExchangeTransaction transaction)
        {
            return new ExchangeTransactionDto
            {
                Id = transaction.Id,
                TransactionNumber = transaction.TransactionNumber,
                BranchId = transaction.BranchId,
                BranchName = transaction.BranchName,
                ExchangeRateId = transaction.ExchangeRateId,
                ExchangeType = transaction.ExchangeType,
                ExchangeTypeName = transaction.ExchangeType.ToString(),
                FromCurrency = transaction.FromCurrency,
                FromCurrencyName = transaction.FromCurrency.ToString(),
                ToCurrency = transaction.ToCurrency,
                ToCurrencyName = transaction.ToCurrency.ToString(),
                FromAmount = transaction.FromAmount,
                ToAmount = transaction.ToAmount,
                ExchangeRate = transaction.ExchangeRate,
                CommissionAmount = transaction.CommissionAmount,
                CommissionRate = transaction.CommissionRate,
                NetAmount = transaction.NetAmount,
                CustomerName = transaction.CustomerName,
                CustomerDocument = transaction.CustomerDocument,
                CustomerPhone = transaction.CustomerPhone,
                Status = transaction.Status,
                StatusName = transaction.Status.ToString(),
                TransactionDate = transaction.TransactionDate,
                ProcessedBy = transaction.ProcessedBy,
                ProcessedByName = transaction.ProcessedByName,
                ApprovedBy = transaction.ApprovedBy,
                Notes = transaction.Notes,
                ReceiptNumber = transaction.ReceiptNumber,
                ReceiptPrinted = transaction.ReceiptPrinted,
                CreatedAt = transaction.CreatedAt,
                UpdatedAt = transaction.UpdatedAt
            };
        }

        private CurrencyReserveDto MapCurrencyReserveToDto(CurrencyReserve reserve)
        {
            return new CurrencyReserveDto
            {
                Id = reserve.Id,
                BranchId = reserve.BranchId,
                BranchName = reserve.BranchName,
                Currency = reserve.Currency,
                CurrencyName = reserve.Currency.ToString(),
                CurrentBalance = reserve.CurrentBalance,
                MinimumBalance = reserve.MinimumBalance,
                MaximumBalance = reserve.MaximumBalance,
                DailyLimit = reserve.DailyLimit,
                DailyUsed = reserve.DailyUsed,
                LastRestockDate = reserve.LastRestockDate,
                LastDepositDate = reserve.LastDepositDate,
                IsActive = reserve.IsActive,
                Notes = reserve.Notes,
                CreatedAt = reserve.CreatedAt,
                UpdatedAt = reserve.UpdatedAt,
                UpdatedBy = reserve.UpdatedBy
            };
        }

        private CurrencyMovementDto MapCurrencyMovementToDto(CurrencyMovement movement)
        {
            return new CurrencyMovementDto
            {
                Id = movement.Id,
                CurrencyReserveId = movement.CurrencyReserveId,
                Currency = movement.CurrencyReserve?.Currency ?? CurrencyType.HTG,
                CurrencyName = movement.CurrencyReserve?.Currency.ToString() ?? "HTG",
                MovementType = movement.MovementType,
                MovementTypeName = movement.MovementType.ToString(),
                Amount = movement.Amount,
                BalanceBefore = movement.BalanceBefore,
                BalanceAfter = movement.BalanceAfter,
                Reference = movement.Reference,
                ExchangeTransactionId = movement.ExchangeTransactionId,
                Description = movement.Description,
                Notes = movement.Notes,
                MovementDate = movement.MovementDate,
                ProcessedBy = movement.ProcessedBy,
                ProcessedByName = movement.ProcessedByName,
                CreatedAt = movement.CreatedAt
            };
        }
    }
}