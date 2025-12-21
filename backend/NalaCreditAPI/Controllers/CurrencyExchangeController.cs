using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.Utilities;
using System.Security.Claims;

namespace NalaCreditAPI.Controllers
{
    [ApiController]
    [Route("api/currency-exchange")]
    [Authorize]
    public class CurrencyExchangeController : ControllerBase
    {
        private readonly ICurrencyExchangeService _currencyExchangeService;
        private readonly ILogger<CurrencyExchangeController> _logger;

        public CurrencyExchangeController(
            ICurrencyExchangeService currencyExchangeService,
            ILogger<CurrencyExchangeController> logger)
        {
            _currencyExchangeService = currencyExchangeService;
            _logger = logger;
        }

        private string GetCurrentUser()
        {
            return User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        }

        private Guid GetCurrentBranchId(string? branchIdSource = null)
        {
            if (BranchIntegrationHelper.TryParseBranchGuid(branchIdSource, out var branchGuidFromPayload, out _))
            {
                return branchGuidFromPayload;
            }

            var branchIdClaim = User.FindFirst("BranchId")?.Value;
            if (BranchIntegrationHelper.TryParseBranchGuid(branchIdClaim, out var branchGuidFromClaim, out _))
            {
                return branchGuidFromClaim;
            }

            _logger.LogWarning("Unable to resolve branch context. Provided value: {ProvidedValue}, claim value: {ClaimValue}", branchIdSource, branchIdClaim);
            return Guid.Empty;
        }

        #region Exchange Rate Management

        [HttpPost("rates")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> CreateExchangeRate([FromBody] CreateExchangeRateDto dto)
        {
            try
            {
                var rate = await _currencyExchangeService.CreateExchangeRateAsync(dto, GetCurrentUser());
                return Ok(new { success = true, data = rate, message = "Exchange rate created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating exchange rate");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("rates/current")]
        public async Task<IActionResult> GetCurrentExchangeRate([FromQuery] CurrencyType baseCurrency = CurrencyType.HTG, [FromQuery] CurrencyType targetCurrency = CurrencyType.USD)
        {
            try
            {
                var rate = await _currencyExchangeService.GetCurrentExchangeRateAsync(baseCurrency, targetCurrency);
                return Ok(new { success = true, data = rate });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current exchange rate for {BaseCurrency} to {TargetCurrency}", baseCurrency, targetCurrency);
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("current-rates")]
        public async Task<IActionResult> GetCurrentExchangeRates()
        {
            try
            {
                // Get all active current exchange rates
                var searchDto = new ExchangeRateSearchDto
                {
                    IsActive = true,
                    Page = 1,
                    PageSize = 100 // Get all active rates
                };
                var rates = await _currencyExchangeService.GetExchangeRatesAsync(searchDto);
                return Ok(new { success = true, data = rates });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current exchange rates");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("rates")]
        public async Task<IActionResult> GetExchangeRates([FromQuery] ExchangeRateSearchDto searchDto)
        {
            try
            {
                // For branch managers, filter by their branch only
                var userRole = User.FindFirst("http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;
                var isBranchManager = !string.IsNullOrEmpty(userRole) && 
                    (userRole.Equals("Manager", StringComparison.OrdinalIgnoreCase) ||
                     userRole.Equals("BranchManager", StringComparison.OrdinalIgnoreCase) ||
                     userRole.Equals("BranchSupervisor", StringComparison.OrdinalIgnoreCase) ||
                     userRole.Contains("Manager", StringComparison.OrdinalIgnoreCase));

                if (isBranchManager && string.IsNullOrEmpty(searchDto.BranchId))
                {
                    var branchIdClaim = User.FindFirst("BranchId")?.Value;
                    if (!string.IsNullOrEmpty(branchIdClaim))
                    {
                        searchDto.BranchId = branchIdClaim;
                    }
                }

                var rates = await _currencyExchangeService.GetExchangeRatesAsync(searchDto);
                return Ok(new { success = true, data = rates });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exchange rates");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("rates/{rateId}")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> UpdateExchangeRate(Guid rateId, [FromBody] UpdateExchangeRateDto dto)
        {
            try
            {
                var rate = await _currencyExchangeService.UpdateExchangeRateAsync(rateId, dto, GetCurrentUser());
                return Ok(new { success = true, data = rate, message = "Exchange rate updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating exchange rate {RateId}", rateId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("rates/{rateId}")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> DeactivateExchangeRate(Guid rateId)
        {
            try
            {
                var result = await _currencyExchangeService.DeactivateExchangeRateAsync(rateId, GetCurrentUser());
                if (result)
                {
                    return Ok(new { success = true, message = "Exchange rate deactivated successfully" });
                }
                return NotFound(new { success = false, message = "Exchange rate not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deactivating exchange rate {RateId}", rateId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("rates/{rateId}/permanent")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> DeleteExchangeRate(Guid rateId)
        {
            try
            {
                var deleted = await _currencyExchangeService.DeleteExchangeRateAsync(rateId);
                if (deleted)
                {
                    return Ok(new { success = true, message = "Exchange rate deleted successfully" });
                }
                return NotFound(new { success = false, message = "Exchange rate not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting exchange rate {RateId}", rateId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Exchange Calculations & Transactions

        [HttpPost("calculate")]
        public async Task<IActionResult> CalculateExchange([FromBody] ExchangeCalculationDto dto)
        {
            try
            {
                var branchId = GetCurrentBranchId(dto.BranchId);
                if (branchId == Guid.Empty)
                {
                    return BadRequest(new { success = false, message = "Branch information is required" });
                }

                var result = await _currencyExchangeService.CalculateExchangeAsync(dto, branchId);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating exchange");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("transactions")]
        [Authorize(Policy = "CashierPolicy")]
        public async Task<IActionResult> ProcessExchangeTransaction([FromBody] CreateExchangeTransactionDto dto)
        {
            try
            {
                var branchId = GetCurrentBranchId(dto.BranchId);
                if (branchId == Guid.Empty)
                {
                    return BadRequest(new { success = false, message = "Branch information is required" });
                }

                var transaction = await _currencyExchangeService.ProcessExchangeTransactionAsync(dto, branchId, GetCurrentUser());
                return Ok(new { success = true, data = transaction, message = "Exchange transaction processed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing exchange transaction");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("transactions/{transactionId}")]
        public async Task<IActionResult> GetExchangeTransaction(Guid transactionId)
        {
            try
            {
                var transaction = await _currencyExchangeService.GetExchangeTransactionAsync(transactionId);
                return Ok(new { success = true, data = transaction });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exchange transaction {TransactionId}", transactionId);
                return NotFound(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> GetExchangeTransactions([FromQuery] ExchangeTransactionSearchDto searchDto)
        {
            try
            {
                // If no branch specified and includeAll is not requested, use current user's branch
                if (!searchDto.BranchGuid.HasValue && searchDto.IncludeAll != true)
                {
                    var branchId = GetCurrentBranchId();
                    if (branchId != Guid.Empty)
                    {
                        searchDto.BranchId = branchId.ToString();
                    }
                }

                var transactions = await _currencyExchangeService.GetExchangeTransactionsAsync(searchDto);
                return Ok(new { success = true, data = transactions });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exchange transactions");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("transactions/{transactionId}/cancel")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> CancelExchangeTransaction(Guid transactionId, [FromBody] CancelTransactionDto dto)
        {
            try
            {
                var transaction = await _currencyExchangeService.CancelExchangeTransactionAsync(transactionId, GetCurrentUser(), dto.Reason);
                return Ok(new { success = true, data = transaction, message = "Exchange transaction cancelled successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling exchange transaction {TransactionId}", transactionId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("transactions/{transactionId}/print-receipt")]
        public async Task<IActionResult> PrintReceipt(Guid transactionId)
        {
            try
            {
                var receipt = await _currencyExchangeService.PrintReceiptAsync(transactionId);
                return Ok(new { success = true, data = receipt, message = "Receipt generated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error printing receipt for transaction {TransactionId}", transactionId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Currency Reserve Management

        [HttpGet("reserves")]
        public async Task<IActionResult> GetBranchCurrencyReserves([FromQuery] Guid? branchId = null)
        {
            try
            {
                var targetBranchId = branchId ?? GetCurrentBranchId();
                if (targetBranchId == Guid.Empty)
                {
                    return BadRequest(new { success = false, message = "Branch information is required" });
                }

                var reserves = await _currencyExchangeService.GetBranchCurrencyReservesAsync(targetBranchId);
                return Ok(new { success = true, data = reserves });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting currency reserves for branch {BranchId}", branchId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("reserves/{currency}")]
        public async Task<IActionResult> GetCurrencyReserve(CurrencyType currency, [FromQuery] Guid? branchId = null)
        {
            try
            {
                var targetBranchId = branchId ?? GetCurrentBranchId();
                if (targetBranchId == Guid.Empty)
                {
                    return BadRequest(new { success = false, message = "Branch information is required" });
                }

                var reserve = await _currencyExchangeService.GetCurrencyReserveAsync(targetBranchId, currency);
                return Ok(new { success = true, data = reserve });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting currency reserve for {Currency} in branch {BranchId}", currency, branchId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("reserves/{reserveId}")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> UpdateCurrencyReserve(Guid reserveId, [FromBody] UpdateCurrencyReserveDto dto)
        {
            try
            {
                var reserve = await _currencyExchangeService.UpdateCurrencyReserveAsync(reserveId, dto, GetCurrentUser());
                return Ok(new { success = true, data = reserve, message = "Currency reserve updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating currency reserve {ReserveId}", reserveId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("movements")]
        [Authorize(Policy = "BranchPolicy")]
        public async Task<IActionResult> AddCurrencyMovement([FromBody] CreateCurrencyMovementDto dto)
        {
            try
            {
                var movement = await _currencyExchangeService.AddCurrencyMovementAsync(dto, GetCurrentUser());
                return Ok(new { success = true, data = movement, message = "Currency movement added successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding currency movement");
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("reserves/{reserveId}/movements")]
        public async Task<IActionResult> GetCurrencyMovements(Guid reserveId, [FromQuery] DateTime? fromDate = null, [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var movements = await _currencyExchangeService.GetCurrencyMovementsAsync(reserveId, fromDate, toDate);
                return Ok(new { success = true, data = movements });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting currency movements for reserve {ReserveId}", reserveId);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Reports

        [HttpGet("reports/summary")]
        public async Task<IActionResult> GetExchangeSummary([FromQuery] DateTime? date = null, [FromQuery] Guid? branchId = null)
        {
            try
            {
                var targetBranchId = branchId ?? GetCurrentBranchId();
                if (targetBranchId == Guid.Empty)
                {
                    return BadRequest(new { success = false, message = "Branch information is required" });
                }

                var reportDate = date ?? DateTime.Today;
                var summary = await _currencyExchangeService.GetExchangeSummaryAsync(targetBranchId, reportDate);
                return Ok(new { success = true, data = summary });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exchange summary for branch {BranchId} on {Date}", branchId, date);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("reports/daily")]
        public async Task<IActionResult> GetDailyExchangeReport([FromQuery] DateTime? date = null, [FromQuery] Guid? branchId = null)
        {
            try
            {
                var targetBranchId = branchId ?? GetCurrentBranchId();
                if (targetBranchId == Guid.Empty)
                {
                    return BadRequest(new { success = false, message = "Branch information is required" });
                }

                var reportDate = date ?? DateTime.Today;
                var report = await _currencyExchangeService.GetDailyExchangeReportAsync(targetBranchId, reportDate);
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting daily exchange report for branch {BranchId} on {Date}", branchId, date);
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        #endregion
    }

    // Helper DTOs for controller endpoints
    public class CancelTransactionDto
    {
        public string Reason { get; set; } = string.Empty;
    }
}