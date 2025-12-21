using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NalaCreditDesktop.Models;

namespace NalaCreditDesktop.Services
{
    public interface ICashierService
    {
        Task<CashierSession> GetCurrentSessionAsync();
        Task<CashBalance> GetCurrentBalanceAsync();
        Task<bool> OpenCashierSessionAsync(decimal htgAmount, decimal usdAmount);
        Task<bool> CloseCashierSessionAsync();
        Task<DailyTransactionSummary> GetDailyTransactionSummaryAsync();
        Task<CashierStatistics> GetCashierStatisticsAsync();
        Task<List<CashierAlert>> GetActiveAlertsAsync();
        Task<bool> UpdateBalanceAsync(decimal htgAmount, decimal usdAmount);
    }

    public interface ITransactionService
    {
        Task<List<TransactionSummary>> GetRecentTransactionsAsync(int count = 10, DateTime? dateFrom = null, DateTime? dateTo = null, string? type = null);
        Task<bool> ProcessDepositAsync(string accountId, decimal amount, string currency, int? branchId = null, string? cashierName = null, string? cashierCaisseNumber = null);
        Task<bool> ProcessWithdrawalAsync(string accountId, decimal amount, string currency, int? branchId = null, string? cashierName = null, string? cashierCaisseNumber = null);
        Task<bool> ProcessExchangeAsync(decimal fromAmount, string fromCurrency, decimal toAmount, string toCurrency);
        Task<TransactionSummary> GetTransactionDetailsAsync(string transactionId);
    }

    public interface IAlertService
    {
        Task<List<CashierAlert>> CheckBalanceAlertsAsync(decimal htgBalance, decimal usdBalance);
        Task<bool> CreateAlertAsync(CashierAlert alert);
        Task<bool> DismissAlertAsync(string alertId);
        Task<List<CashierAlert>> GetAlertHistoryAsync();
    }

    public interface IReportService
    {
        Task<byte[]> GenerateDailyReportAsync(DateTime date);
        Task<byte[]> ExportTransactionsToExcelAsync(DateTime fromDate, DateTime toDate);
        Task<bool> SendReportByEmailAsync(byte[] reportData, string recipientEmail);
    }

    // Implémentations de base pour les services
    public class CashierService : ICashierService
    {
        public async Task<CashierSession> GetCurrentSessionAsync()
        {
            await Task.Delay(100); // Simulation d'appel API
            return new CashierSession
            {
                SessionId = "CS-2025-001",
                CashierName = "Marie Dupont",
                BranchName = "Succursale Centre-Ville",
                StartTime = DateTime.Now.AddHours(-4),
                IsActive = true,
                OpeningBalanceHTG = 1_500_000m,
                OpeningBalanceUSD = 8_000m
            };
        }

        public async Task<CashBalance> GetCurrentBalanceAsync()
        {
            await Task.Delay(100);
            return new CashBalance
            {
                HTG = 2_580_750m,
                USD = 12_450.75m,
                LastUpdated = DateTime.Now
            };
        }

        public async Task<bool> OpenCashierSessionAsync(decimal htgAmount, decimal usdAmount)
        {
            await Task.Delay(500);
            // Logique d'ouverture de session
            return true;
        }

        public async Task<bool> CloseCashierSessionAsync()
        {
            await Task.Delay(500);
            // Logique de fermeture de session
            return true;
        }

        public async Task<DailyTransactionSummary> GetDailyTransactionSummaryAsync()
        {
            await Task.Delay(200);
            return new DailyTransactionSummary
            {
                DepositsCount = 23,
                DepositsAmountHTG = 1_250_000m,
                DepositsAmountUSD = 3_200m,
                WithdrawalsCount = 18,
                WithdrawalsAmountHTG = 560_000m,
                WithdrawalsAmountUSD = 1_850m,
                UsdSalesAmount = 600_000m,
                UsdPurchaseAmount = 1_450.75m,
                TotalTransactions = 47,
                ClientsServed = 41
            };
        }

        public async Task<CashierStatistics> GetCashierStatisticsAsync()
        {
            await Task.Delay(200);
            return new CashierStatistics
            {
                ClientsServedToday = 41,
                TransactionsProcessedToday = 47,
                AverageTransactionTime = TimeSpan.FromMinutes(2.25),
                ErrorRate = 0.021,
                DailyGoalProgress = 78.5,
                DailyGoalAmount = 50_000m,
                ActiveTime = TimeSpan.FromHours(4.5)
            };
        }

        public async Task<List<CashierAlert>> GetActiveAlertsAsync()
        {
            await Task.Delay(100);
            return new List<CashierAlert>
            {
                new CashierAlert
                {
                    Level = CashierAlert.AlertLevel.Warning,
                    Message = "Le solde HTG approche de la limite (>80% du seuil)",
                    CreatedAt = DateTime.Now.AddMinutes(-5),
                    IsActive = true,
                    Category = "Balance"
                }
            };
        }

        public async Task<bool> UpdateBalanceAsync(decimal htgAmount, decimal usdAmount)
        {
            await Task.Delay(300);
            // Logique de mise à jour des soldes
            return true;
        }
    }

    public class TransactionService : ITransactionService
    {
        public async Task<List<TransactionSummary>> GetRecentTransactionsAsync(int count = 10, DateTime? dateFrom = null, DateTime? dateTo = null, string? type = null)
        {
            var api = AppServices.ApiService;

            // Try branch history when a branch id is available. Otherwise fall back to the dashboard recent transactions.
            List<BranchTransactionHistoryItem>? items = null;
            if (api?.CurrentUser?.BranchId != null)
            {
                var history = await api.GetBranchTransactionHistoryAsync(
                    api.CurrentUser.BranchId.Value,
                    startDate: dateFrom,
                    endDate: dateTo,
                    transactionType: MapTypeToApiCode(type),
                    page: 1,
                    pageSize: Math.Max(count, 200));

                items = history?.Transactions;
            }

            // If branch history is unavailable or empty, fall back to the dashboard recent transactions
            if (items == null || items.Count == 0)
            {
                var dashboard = await api.GetCashierDashboardAsync();
                if (dashboard.IsSuccess && dashboard.Data?.RecentTransactions != null)
                {
                    return dashboard.Data.RecentTransactions
                        .Select(MapDashboardTransaction)
                        .Take(count)
                        .ToList();
                }

                return new List<TransactionSummary>();
            }

            return items
                .Select(MapTransaction)
                .Take(count)
                .ToList();
        }

        public async Task<bool> ProcessDepositAsync(string accountId, decimal amount, string currency, int? branchId = null, string? cashierName = null, string? cashierCaisseNumber = null)
        {
            var api = AppServices.GetRequiredApiService();

            if (!int.TryParse(accountId, out var accountNumeric))
            {
                throw new InvalidOperationException("Numéro de compte invalide pour le dépôt");
            }

            var parsedCurrency = ParseCurrencyCode(currency);

            return await api.ProcessDepositAsync(accountNumeric, amount, parsedCurrency, branchId, cashierName, cashierCaisseNumber);
        }

        public async Task<bool> ProcessWithdrawalAsync(string accountId, decimal amount, string currency, int? branchId = null, string? cashierName = null, string? cashierCaisseNumber = null)
        {
            var api = AppServices.GetRequiredApiService();

            if (!int.TryParse(accountId, out var accountNumeric))
            {
                throw new InvalidOperationException("Numéro de compte invalide pour le retrait");
            }

            var parsedCurrency = ParseCurrencyCode(currency);

            return await api.ProcessWithdrawalAsync(accountNumeric, amount, parsedCurrency, branchId, cashierName, cashierCaisseNumber);
        }

        public async Task<bool> ProcessExchangeAsync(decimal fromAmount, string fromCurrency, decimal toAmount, string toCurrency)
        {
            await Task.Delay(1200);
            // Logique de traitement de change
            return true;
        }

        public async Task<TransactionSummary> GetTransactionDetailsAsync(string transactionId)
        {
            // For now return the first match from the last fetch; a dedicated endpoint can replace this when available.
            var items = await GetRecentTransactionsAsync(200);
            var match = items.FirstOrDefault(t => string.Equals(t.Id, transactionId, StringComparison.OrdinalIgnoreCase)
                || string.Equals(t.ReferenceNumber, transactionId, StringComparison.OrdinalIgnoreCase));

            return match ?? new TransactionSummary
            {
                Id = transactionId,
                Time = DateTime.Now,
                CreatedAt = DateTime.Now,
                Type = "Inconnu",
                TransactionType = "Inconnu",
                ClientAccount = string.Empty,
                AccountId = string.Empty,
                CustomerName = string.Empty,
                Amount = 0,
                Currency = string.Empty,
                Status = "Inconnu",
                ReferenceNumber = transactionId,
                ProcessedBy = string.Empty,
                Description = string.Empty
            };
        }

        private static TransactionSummary MapTransaction(BranchTransactionHistoryItem item)
        {
            var created = item.CreatedAt;
            if (created.Kind == DateTimeKind.Unspecified)
            {
                created = DateTime.SpecifyKind(created, DateTimeKind.Utc);
            }

            if (created.Kind == DateTimeKind.Utc)
            {
                created = created.ToLocalTime();
            }

            var accountNumber = string.IsNullOrWhiteSpace(item.AccountNumber)
                ? (item.AccountId == 0 ? string.Empty : item.AccountId.ToString())
                : item.AccountNumber;

            var typeLabel = NormalizeTransactionType(item.Type);

            return new TransactionSummary
            {
                Id = item.Id.ToString(),
                Time = created,
                CreatedAt = created,
                Type = typeLabel,
                TransactionType = typeLabel,
                ClientAccount = !string.IsNullOrWhiteSpace(item.Customer)
                    ? $"{item.Customer} ({accountNumber})"
                    : (!string.IsNullOrWhiteSpace(accountNumber) ? accountNumber : string.Empty),
                AccountId = accountNumber,
                CustomerName = item.Customer,
                Amount = item.Amount,
                Currency = NormalizeCurrency(item.Currency),
                Status = NormalizeStatus(item.Status),
                ReferenceNumber = item.TransactionNumber,
                ProcessedBy = item.Cashier,
                Description = item.Description ?? string.Empty
            };
        }

        private static TransactionSummary MapDashboardTransaction(CashierTransaction item)
        {
            var created = item.CreatedAt;
            if (created.Kind == DateTimeKind.Unspecified)
            {
                created = DateTime.SpecifyKind(created, DateTimeKind.Utc);
            }

            if (created.Kind == DateTimeKind.Utc)
            {
                created = created.ToLocalTime();
            }

            var typeLabel = NormalizeTransactionType(item.Type);
            return new TransactionSummary
            {
                Id = item.Id,
                Time = created,
                CreatedAt = created,
                Type = typeLabel,
                TransactionType = typeLabel,
                ClientAccount = !string.IsNullOrWhiteSpace(item.CustomerName)
                    ? $"{item.CustomerName} ({item.AccountNumber})"
                    : (!string.IsNullOrWhiteSpace(item.AccountLabel)
                        ? item.AccountLabel
                        : (!string.IsNullOrWhiteSpace(item.AccountNumber)
                            ? item.AccountNumber
                            : string.Empty)),
                AccountId = item.AccountNumber,
                CustomerName = item.CustomerName,
                Amount = item.Amount,
                Currency = NormalizeCurrency(item.Currency),
                Status = NormalizeStatus(item.Status),
                ReferenceNumber = item.TransactionNumber,
                ProcessedBy = item.ProcessedBy,
                Description = string.Empty
            };
        }

        private static Currency ParseCurrencyCode(string currency)
        {
            if (string.IsNullOrWhiteSpace(currency))
            {
                return Currency.HTG;
            }

            if (int.TryParse(currency, out var numeric))
            {
                return numeric == 2 ? Currency.USD : Currency.HTG;
            }

            var code = currency.Trim().ToUpperInvariant();
            return code switch
            {
                "USD" => Currency.USD,
                "HTG" => Currency.HTG,
                _ => Currency.HTG
            };
        }

        private static string NormalizeCurrency(string? currency)
        {
            if (string.IsNullOrWhiteSpace(currency))
            {
                return string.Empty;
            }

            if (int.TryParse(currency, out var numeric))
            {
                return numeric == 2 ? "USD" : "HTG";
            }

            var code = currency.Trim().ToUpperInvariant();
            return code switch
            {
                "USD" => "USD",
                "HTG" => "HTG",
                _ => code
            };
        }

        private static string NormalizeTransactionType(string? type)
        {
            if (string.IsNullOrWhiteSpace(type))
            {
                return "Inconnu";
            }

            if (int.TryParse(type, out var numeric))
            {
                return numeric switch
                {
                    1 => "Dépôt",
                    2 => "Retrait",
                    6 => "Change",
                    _ => type
                };
            }

            var normalized = type.Trim().ToLowerInvariant();
            return normalized switch
            {
                "deposit" => "Dépôt",
                "withdrawal" => "Retrait",
                "currencyexchange" => "Change",
                "change" => "Change",
                _ => type
            };
        }

        private static int? MapTypeToApiCode(string? type)
        {
            if (string.IsNullOrWhiteSpace(type))
            {
                return null;
            }

            if (int.TryParse(type, out var numeric))
            {
                return numeric;
            }

            var normalized = type.Trim().ToLowerInvariant();
            return normalized switch
            {
                "dépôt" => 1,
                "depot" => 1,
                "deposit" => 1,
                "retrait" => 2,
                "withdrawal" => 2,
                "change" => 6,
                "currencyexchange" => 6,
                _ => null
            };
        }

        private static string NormalizeStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return "Inconnu";
            }

            var normalized = status.Trim().ToLowerInvariant();
            return normalized switch
            {
                "completed" => "Complété",
                "pending" => "En attente",
                "failed" => "Échoué",
                "cancelled" => "Annulé",
                "canceled" => "Annulé",
                "reversed" => "Annulé",
                _ => status
            };
        }
    }

    public class AlertService : IAlertService
    {
        public async Task<List<CashierAlert>> CheckBalanceAlertsAsync(decimal htgBalance, decimal usdBalance)
        {
            await Task.Delay(100);
            var alerts = new List<CashierAlert>();

            // Vérifier les seuils HTG
            if (htgBalance > 2_500_000m)
            {
                alerts.Add(new CashierAlert
                {
                    Level = CashierAlert.AlertLevel.Critical,
                    Message = "ALERTE: Solde HTG au-dessus du seuil de sécurité!",
                    CreatedAt = DateTime.Now,
                    IsActive = true,
                    Category = "Balance"
                });
            }
            else if (htgBalance > 2_000_000m)
            {
                alerts.Add(new CashierAlert
                {
                    Level = CashierAlert.AlertLevel.Warning,
                    Message = "Le solde HTG approche de la limite de sécurité",
                    CreatedAt = DateTime.Now,
                    IsActive = true,
                    Category = "Balance"
                });
            }

            // Vérifier les seuils USD
            if (usdBalance > 15_000m)
            {
                alerts.Add(new CashierAlert
                {
                    Level = CashierAlert.AlertLevel.Critical,
                    Message = "ALERTE: Solde USD au-dessus du seuil de sécurité!",
                    CreatedAt = DateTime.Now,
                    IsActive = true,
                    Category = "Balance"
                });
            }
            else if (usdBalance > 12_000m)
            {
                alerts.Add(new CashierAlert
                {
                    Level = CashierAlert.AlertLevel.Warning,
                    Message = "Le solde USD approche de la limite de sécurité",
                    CreatedAt = DateTime.Now,
                    IsActive = true,
                    Category = "Balance"
                });
            }

            return alerts;
        }

        public async Task<bool> CreateAlertAsync(CashierAlert alert)
        {
            await Task.Delay(100);
            return true;
        }

        public async Task<bool> DismissAlertAsync(string alertId)
        {
            await Task.Delay(100);
            return true;
        }

        public async Task<List<CashierAlert>> GetAlertHistoryAsync()
        {
            await Task.Delay(200);
            return new List<CashierAlert>();
        }
    }
}