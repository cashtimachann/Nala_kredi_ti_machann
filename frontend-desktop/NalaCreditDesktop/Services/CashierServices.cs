using System;
using System.Collections.Generic;
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
        Task<List<TransactionSummary>> GetRecentTransactionsAsync(int count = 10);
        Task<bool> ProcessDepositAsync(string accountId, decimal amount, string currency);
        Task<bool> ProcessWithdrawalAsync(string accountId, decimal amount, string currency);
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
        public async Task<List<TransactionSummary>> GetRecentTransactionsAsync(int count = 10)
        {
            await Task.Delay(200);
            var transactions = new List<TransactionSummary>();
            
            var random = new Random();
            var types = new[] { "Dépôt", "Retrait", "Change" };
            var statuses = new[] { "Complété", "En attente", "Échoué" };
            var currencies = new[] { "HTG", "USD" };

            for (int i = 0; i < count; i++)
            {
                var currency = currencies[random.Next(currencies.Length)];
                var type = types[random.Next(types.Length)];
                var amount = currency == "HTG" ? random.Next(5000, 100000) : random.Next(50, 1000);
                var accountNum = $"2001000{random.Next(10000, 99999)}";
                
                transactions.Add(new TransactionSummary
                {
                    Id = Guid.NewGuid().ToString(),
                    Time = DateTime.Now.AddMinutes(-random.Next(1, 180)),
                    CreatedAt = DateTime.Now.AddMinutes(-random.Next(1, 180)),
                    Type = type,
                    TransactionType = type,
                    ClientAccount = $"Client-{random.Next(100, 999)} (AC-{random.Next(100, 999)})",
                    AccountId = accountNum,
                    CustomerName = $"Client {random.Next(100, 999)}",
                    Amount = amount,
                    Currency = currency,
                    Status = statuses[random.Next(statuses.Length)],
                    ReferenceNumber = $"TRX-{DateTime.Now:yyyyMMdd}-{random.Next(1000, 9999)}",
                    ProcessedBy = "Caissier Principal",
                    Description = $"Transaction {type.ToLower()}"
                });
            }

            return transactions;
        }

        public async Task<bool> ProcessDepositAsync(string accountId, decimal amount, string currency)
        {
            await Task.Delay(1000);
            // Logique de traitement de dépôt
            return true;
        }

        public async Task<bool> ProcessWithdrawalAsync(string accountId, decimal amount, string currency)
        {
            await Task.Delay(1000);
            // Logique de traitement de retrait
            return true;
        }

        public async Task<bool> ProcessExchangeAsync(decimal fromAmount, string fromCurrency, decimal toAmount, string toCurrency)
        {
            await Task.Delay(1200);
            // Logique de traitement de change
            return true;
        }

        public async Task<TransactionSummary> GetTransactionDetailsAsync(string transactionId)
        {
            await Task.Delay(300);
            return new TransactionSummary
            {
                Id = transactionId,
                Time = DateTime.Now,
                CreatedAt = DateTime.Now,
                Type = "Dépôt",
                TransactionType = "Dépôt",
                ClientAccount = "Test Account",
                AccountId = "200100012345",
                CustomerName = "Test Client",
                Amount = 10000,
                Currency = "HTG",
                Status = "Complété",
                ReferenceNumber = $"TRX-{DateTime.Now:yyyyMMdd}-1234",
                ProcessedBy = "Caissier Principal",
                Description = "Transaction de test"
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