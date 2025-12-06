using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Services;

public interface IBranchReportService
{
    Task<DailyBranchReportDto> GenerateDailyReportAsync(int branchId, DateTime reportDate);
    Task<MonthlyBranchReportDto> GenerateMonthlyReportAsync(int branchId, int month, int year);
    Task<BranchPerformanceComparisonDto> GeneratePerformanceComparisonAsync(DateTime startDate, DateTime endDate);
    Task<DailyBranchReportDto> GenerateCustomReportAsync(BranchReportRequestDto request);
    
    // Méthodes pour SuperAdmin
    Task<SuperAdminConsolidatedReportDto> GenerateConsolidatedReportAsync(DateTime startDate, DateTime endDate);
    Task<SuperAdminTransactionAuditDto> GetTransactionAuditAsync(DateTime startDate, DateTime endDate, int? branchId = null, string? transactionType = null, string? userId = null);
    Task<SuperAdminDashboardStatsDto> GetDashboardStatsAsync();
}

public class BranchReportService : IBranchReportService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BranchReportService> _logger;

    public BranchReportService(ApplicationDbContext context, ILogger<BranchReportService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<DailyBranchReportDto> GenerateDailyReportAsync(int branchId, DateTime reportDate)
    {
        var branch = await _context.Branches.FindAsync(branchId);
        if (branch == null)
            throw new KeyNotFoundException($"Succursale avec ID {branchId} introuvable");

        var startDate = reportDate.Date;
        var endDate = startDate.AddDays(1);

        var report = new DailyBranchReportDto
        {
            BranchId = branchId,
            BranchName = branch.Name,
            ReportDate = reportDate
        };

        // Crédits décaissés
        await PopulateCreditsDisbursedAsync(report, branchId, startDate, endDate);

        // Paiements de crédits reçus
        await PopulatePaymentsReceivedAsync(report, branchId, startDate, endDate);

        // Dépôts et retraits
        await PopulateDepositsAndWithdrawalsAsync(report, branchId, startDate, endDate);

        // Solde de caisse
        await PopulateCashBalanceAsync(report, branchId, startDate, endDate);

        // Transferts inter-succursales
        await PopulateInterBranchTransfersAsync(report, branchId, startDate, endDate);

        // Statistiques générales
        report.TotalTransactions = report.DepositsCount + report.WithdrawalsCount + 
                                   report.PaymentsReceivedCount + report.CreditsDisbursedCount;

        return report;
    }

    private async Task PopulateCreditsDisbursedAsync(DailyBranchReportDto report, int branchId, DateTime startDate, DateTime endDate)
    {
        // Crédits réguliers
        var regularCredits = await _context.Credits
            .Include(c => c.Application)
                .ThenInclude(a => a.Customer)
            .Include(c => c.Account)
            .Where(c => c.Account.BranchId == branchId &&
                       c.DisbursementDate >= startDate &&
                       c.DisbursementDate < endDate)
            .ToListAsync();

        foreach (var credit in regularCredits)
        {
            report.CreditsDisbursed.Add(new CreditDisbursementDto
            {
                CreditId = credit.Id,
                CreditNumber = credit.CreditNumber,
                CustomerName = $"{credit.Application.Customer.FirstName} {credit.Application.Customer.LastName}",
                AccountNumber = credit.Account.AccountNumber,
                Amount = credit.PrincipalAmount,
                Currency = credit.Application.Currency,
                DisbursementDate = credit.DisbursementDate,
                DisbursedBy = "N/A", // À améliorer si vous avez cette info
                TermWeeks = credit.TermWeeks,
                InterestRate = credit.InterestRate
            });

            if (credit.Application.Currency == Currency.HTG)
                report.TotalCreditsDisbursedHTG += credit.PrincipalAmount;
            else
                report.TotalCreditsDisbursedUSD += credit.PrincipalAmount;
        }

        // Microcrédits
        var microCredits = await _context.MicrocreditLoans
            .Include(l => l.Application)
                .ThenInclude(a => a.Borrower)
            .Where(l => l.BranchId == branchId &&
                       l.DisbursementDate >= DateOnly.FromDateTime(startDate) &&
                       l.DisbursementDate < DateOnly.FromDateTime(endDate))
            .ToListAsync();

        foreach (var microcredit in microCredits)
        {
            report.CreditsDisbursed.Add(new CreditDisbursementDto
            {
                CreditId = (int)0, // Microcredit uses Guid, not int - set to 0 for compatibility
                CreditNumber = microcredit.LoanNumber,
                CustomerName = $"{microcredit.Application.Borrower.FirstName} {microcredit.Application.Borrower.LastName}",
                AccountNumber = "MC-" + microcredit.LoanNumber,
                Amount = microcredit.PrincipalAmount,
                Currency = microcredit.Currency == MicrocreditCurrency.HTG ? Currency.HTG : Currency.USD,
                DisbursementDate = microcredit.DisbursementDate.ToDateTime(TimeOnly.MinValue),
                DisbursedBy = "N/A",
                TermWeeks = microcredit.DurationMonths * 4, // Convert months to approximate weeks
                InterestRate = microcredit.InterestRate
            });

            if (microcredit.Currency == MicrocreditCurrency.HTG)
                report.TotalCreditsDisbursedHTG += microcredit.PrincipalAmount;
            else
                report.TotalCreditsDisbursedUSD += microcredit.PrincipalAmount;
        }

        report.CreditsDisbursedCount = report.CreditsDisbursed.Count;
    }

    private async Task PopulatePaymentsReceivedAsync(DailyBranchReportDto report, int branchId, DateTime startDate, DateTime endDate)
    {
        // Paiements de crédits réguliers
        var regularPayments = await _context.CreditPayments
            .Include(p => p.Credit)
                .ThenInclude(c => c.Application)
                    .ThenInclude(a => a.Customer)
            .Include(p => p.Credit)
                .ThenInclude(c => c.Account)
            .Where(p => p.Credit.Account.BranchId == branchId &&
                       p.PaymentDate >= startDate &&
                       p.PaymentDate < endDate)
            .ToListAsync();

        foreach (var payment in regularPayments)
        {
            var currency = payment.Credit.Application.Currency;
            
            report.PaymentsReceived.Add(new CreditPaymentSummaryDto
            {
                PaymentId = payment.Id,
                CreditNumber = payment.Credit.CreditNumber,
                CustomerName = $"{payment.Credit.Application.Customer.FirstName} {payment.Credit.Application.Customer.LastName}",
                Amount = payment.Amount,
                PrincipalPaid = payment.PrincipalPaid,
                InterestPaid = payment.InterestPaid,
                PenaltyPaid = payment.PenaltyPaid,
                Currency = currency,
                PaymentDate = payment.PaymentDate,
                ReceivedBy = "N/A"
            });

            if (currency == Currency.HTG)
                report.TotalPaymentsReceivedHTG += payment.Amount;
            else
                report.TotalPaymentsReceivedUSD += payment.Amount;
        }

        // Paiements de microcrédits
        var microcreditPayments = await _context.MicrocreditPayments
            .Include(p => p.Loan)
                .ThenInclude(l => l.Application)
                    .ThenInclude(a => a.Borrower)
            .Where(p => p.Loan.BranchId == branchId &&
                       p.PaymentDate >= DateOnly.FromDateTime(startDate) &&
                       p.PaymentDate < DateOnly.FromDateTime(endDate))
            .ToListAsync();

        foreach (var payment in microcreditPayments)
        {
            report.PaymentsReceived.Add(new CreditPaymentSummaryDto
            {
                PaymentId = (int)0, // Microcredit uses Guid, not int - set to 0 for compatibility
                CreditNumber = payment.Loan.LoanNumber,
                CustomerName = $"{payment.Loan.Application.Borrower.FirstName} {payment.Loan.Application.Borrower.LastName}",
                Amount = payment.Amount,
                PrincipalPaid = payment.PrincipalAmount,
                InterestPaid = payment.InterestAmount,
                PenaltyPaid = payment.PenaltyAmount,
                Currency = payment.Loan.Currency == MicrocreditCurrency.HTG ? Currency.HTG : Currency.USD,
                PaymentDate = payment.PaymentDate.ToDateTime(TimeOnly.MinValue),
                ReceivedBy = "N/A"
            });

            if (payment.Loan.Currency == MicrocreditCurrency.HTG)
                report.TotalPaymentsReceivedHTG += payment.Amount;
            else
                report.TotalPaymentsReceivedUSD += payment.Amount;
        }

        report.PaymentsReceivedCount = report.PaymentsReceived.Count;
    }

    private async Task PopulateDepositsAndWithdrawalsAsync(DailyBranchReportDto report, int branchId, DateTime startDate, DateTime endDate)
    {
        string FormatUser(User? user) => BuildUserDisplayName(user);

        void AppendDeposit(TransactionSummaryDto summary, Currency currency, decimal amount)
        {
            report.Deposits.Add(summary);
            if (currency == Currency.HTG)
                report.TotalDepositsHTG += amount;
            else
                report.TotalDepositsUSD += amount;
        }

        void AppendWithdrawal(TransactionSummaryDto summary, Currency currency, decimal amount)
        {
            report.Withdrawals.Add(summary);
            if (currency == Currency.HTG)
                report.TotalWithdrawalsHTG += amount;
            else
                report.TotalWithdrawalsUSD += amount;
        }

        var transactions = await _context.Transactions
            .Include(t => t.Account)
                .ThenInclude(a => a.Customer)
            .Include(t => t.User)
            .Where(t => t.BranchId == branchId &&
                       t.CreatedAt >= startDate &&
                       t.CreatedAt < endDate &&
                       (t.Type == TransactionType.Deposit || t.Type == TransactionType.Withdrawal) &&
                       t.Status == TransactionStatus.Completed)
            .ToListAsync();

        foreach (var transaction in transactions)
        {
            var summary = new TransactionSummaryDto
            {
                TransactionId = transaction.Id,
                TransactionNumber = transaction.TransactionNumber,
                AccountNumber = transaction.Account.AccountNumber,
                CustomerName = $"{transaction.Account.Customer.FirstName} {transaction.Account.Customer.LastName}".Trim(),
                Amount = transaction.Amount,
                Currency = transaction.Currency,
                Type = transaction.Type,
                TransactionDate = transaction.CreatedAt,
                ProcessedBy = FormatUser(transaction.User)
            };

            if (transaction.Type == TransactionType.Deposit)
            {
                AppendDeposit(summary, transaction.Currency, transaction.Amount);
            }
            else
            {
                AppendWithdrawal(summary, transaction.Currency, transaction.Amount);
            }
        }

        var savingsTransactions = await _context.SavingsTransactions
            .Include(t => t.Account)
                .ThenInclude(a => a.Customer)
            .Include(t => t.ProcessedByUser)
            .Where(t => t.BranchId == branchId &&
                        t.ProcessedAt >= startDate &&
                        t.ProcessedAt < endDate &&
                        t.Status == SavingsTransactionStatus.Completed &&
                        (t.Type == SavingsTransactionType.Deposit ||
                         t.Type == SavingsTransactionType.OpeningDeposit ||
                         t.Type == SavingsTransactionType.Withdrawal))
            .ToListAsync();

        foreach (var savingsTransaction in savingsTransactions)
        {
            var currency = MapSavingsCurrency(savingsTransaction.Currency);
            var summary = new TransactionSummaryDto
            {
                TransactionId = 0,
                TransactionNumber = !string.IsNullOrWhiteSpace(savingsTransaction.Reference) ? savingsTransaction.Reference : savingsTransaction.Id,
                AccountNumber = savingsTransaction.Account?.AccountNumber ?? savingsTransaction.AccountNumber,
                CustomerName = savingsTransaction.Account?.Customer?.FullName ?? "N/A",
                Amount = savingsTransaction.Amount,
                Currency = currency,
                Type = savingsTransaction.Type == SavingsTransactionType.Withdrawal ? TransactionType.Withdrawal : TransactionType.Deposit,
                TransactionDate = savingsTransaction.ProcessedAt,
                ProcessedBy = FormatUser(savingsTransaction.ProcessedByUser)
            };

            if (savingsTransaction.Type == SavingsTransactionType.Withdrawal)
            {
                AppendWithdrawal(summary, currency, savingsTransaction.Amount);
            }
            else
            {
                AppendDeposit(summary, currency, savingsTransaction.Amount);
            }
        }

        var termTransactions = await _context.TermSavingsTransactions
            .Include(t => t.Account)
                .ThenInclude(a => a.Customer)
            .Include(t => t.ProcessedByUser)
            .Where(t => t.BranchId == branchId &&
                        t.ProcessedAt >= startDate &&
                        t.ProcessedAt < endDate &&
                        t.Status == SavingsTransactionStatus.Completed &&
                        (t.Type == SavingsTransactionType.Deposit ||
                         t.Type == SavingsTransactionType.OpeningDeposit ||
                         t.Type == SavingsTransactionType.Withdrawal))
            .ToListAsync();

        foreach (var termTransaction in termTransactions)
        {
            var currency = MapClientCurrency(termTransaction.Currency);
            var summary = new TransactionSummaryDto
            {
                TransactionId = 0,
                TransactionNumber = !string.IsNullOrWhiteSpace(termTransaction.Reference) ? termTransaction.Reference : termTransaction.Id,
                AccountNumber = termTransaction.Account?.AccountNumber ?? termTransaction.AccountNumber,
                CustomerName = termTransaction.Account?.Customer?.FullName ?? "N/A",
                Amount = termTransaction.Amount,
                Currency = currency,
                Type = termTransaction.Type == SavingsTransactionType.Withdrawal ? TransactionType.Withdrawal : TransactionType.Deposit,
                TransactionDate = termTransaction.ProcessedAt,
                ProcessedBy = FormatUser(termTransaction.ProcessedByUser)
            };

            if (termTransaction.Type == SavingsTransactionType.Withdrawal)
            {
                AppendWithdrawal(summary, currency, termTransaction.Amount);
            }
            else
            {
                AppendDeposit(summary, currency, termTransaction.Amount);
            }
        }

        var currentAccountTransactions = await _context.CurrentAccountTransactions
            .Include(t => t.Account)
                .ThenInclude(a => a.Customer)
            .Include(t => t.ProcessedByUser)
            .Where(t => t.BranchId == branchId &&
                        t.ProcessedAt >= startDate &&
                        t.ProcessedAt < endDate &&
                        t.Status == SavingsTransactionStatus.Completed &&
                        (t.Type == SavingsTransactionType.Deposit ||
                         t.Type == SavingsTransactionType.OpeningDeposit ||
                         t.Type == SavingsTransactionType.Withdrawal))
            .ToListAsync();

        foreach (var currentTransaction in currentAccountTransactions)
        {
            var currency = MapClientCurrency(currentTransaction.Currency);
            var summary = new TransactionSummaryDto
            {
                TransactionId = 0,
                TransactionNumber = !string.IsNullOrWhiteSpace(currentTransaction.Reference) ? currentTransaction.Reference : currentTransaction.Id,
                AccountNumber = currentTransaction.Account?.AccountNumber ?? currentTransaction.AccountNumber,
                CustomerName = currentTransaction.Account?.Customer?.FullName ?? "N/A",
                Amount = currentTransaction.Amount,
                Currency = currency,
                Type = currentTransaction.Type == SavingsTransactionType.Withdrawal ? TransactionType.Withdrawal : TransactionType.Deposit,
                TransactionDate = currentTransaction.ProcessedAt,
                ProcessedBy = FormatUser(currentTransaction.ProcessedByUser)
            };

            if (currentTransaction.Type == SavingsTransactionType.Withdrawal)
            {
                AppendWithdrawal(summary, currency, currentTransaction.Amount);
            }
            else
            {
                AppendDeposit(summary, currency, currentTransaction.Amount);
            }
        }

        report.DepositsCount = report.Deposits.Count;
        report.WithdrawalsCount = report.Withdrawals.Count;
    }

    private async Task PopulateCashBalanceAsync(DailyBranchReportDto report, int branchId, DateTime startDate, DateTime endDate)
    {
        // Récupérer toutes les sessions de caisse pour la période
        var cashSessions = await _context.CashSessions
            .Include(cs => cs.User)
            .Where(cs => cs.BranchId == branchId &&
                        cs.SessionStart >= startDate &&
                        cs.SessionStart < endDate)
            .OrderBy(cs => cs.SessionStart)
            .ToListAsync();

        decimal totalOpeningHTG = 0;
        decimal totalOpeningUSD = 0;
        decimal totalClosingHTG = 0;
        decimal totalClosingUSD = 0;

        foreach (var session in cashSessions)
        {
            totalOpeningHTG += session.OpeningBalanceHTG;
            totalOpeningUSD += session.OpeningBalanceUSD;
            totalClosingHTG += session.ClosingBalanceHTG ?? session.OpeningBalanceHTG;
            totalClosingUSD += session.ClosingBalanceUSD ?? session.OpeningBalanceUSD;

            report.CashBalance.CashSessions.Add(new CashSessionSummaryDto
            {
                SessionId = session.Id,
                CashierName = session.User != null ? $"{session.User.FirstName} {session.User.LastName}" : "N/A",
                OpeningBalanceHTG = session.OpeningBalanceHTG,
                OpeningBalanceUSD = session.OpeningBalanceUSD,
                ClosingBalanceHTG = session.ClosingBalanceHTG ?? 0,
                ClosingBalanceUSD = session.ClosingBalanceUSD ?? 0,
                OpenedAt = session.SessionStart,
                ClosedAt = session.SessionEnd,
                Status = session.Status.ToString()
            });
        }

        report.CashBalance.OpeningBalanceHTG = totalOpeningHTG;
        report.CashBalance.OpeningBalanceUSD = totalOpeningUSD;
        report.CashBalance.ClosingBalanceHTG = totalClosingHTG;
        report.CashBalance.ClosingBalanceUSD = totalClosingUSD;
        report.CashBalance.NetChangeHTG = totalClosingHTG - totalOpeningHTG;
        report.CashBalance.NetChangeUSD = totalClosingUSD - totalOpeningUSD;

        report.ActiveCashSessions = cashSessions.Count(cs => cs.Status == CashSessionStatus.Open);
        report.CompletedCashSessions = cashSessions.Count(cs => cs.Status == CashSessionStatus.Closed);
    }

    private async Task PopulateInterBranchTransfersAsync(DailyBranchReportDto report, int branchId, DateTime startDate, DateTime endDate)
    {
        var transfers = await _context.InterBranchTransfers
            .Include(t => t.FromBranch)
            .Include(t => t.ToBranch)
            .Where(t => (t.FromBranchId == branchId || t.ToBranchId == branchId) &&
                       t.CreatedAt >= startDate &&
                       t.CreatedAt < endDate)
            .ToListAsync();

        foreach (var transfer in transfers)
        {
            report.InterBranchTransfers.Add(new InterBranchTransferSummaryDto
            {
                TransferId = 0, // InterBranchTransfer uses Guid, not int - set to 0 for compatibility
                TransferNumber = transfer.TransferNumber,
                SourceBranch = transfer.FromBranch.Name,
                DestinationBranch = transfer.ToBranch.Name,
                Amount = transfer.Amount,
                Currency = transfer.Currency == ClientCurrency.HTG ? Currency.HTG : Currency.USD,
                TransferDate = transfer.ProcessedAt ?? transfer.CreatedAt,
                Status = transfer.Status.ToString(),
                InitiatedBy = transfer.RequestedByName ?? transfer.RequestedBy
            });

            if (transfer.FromBranchId == branchId)
            {
                // Transfert sortant
                if (transfer.Currency == ClientCurrency.HTG)
                    report.TotalTransfersOutHTG += transfer.Amount;
                else
                    report.TotalTransfersOutUSD += transfer.Amount;
            }
            else
            {
                // Transfert entrant
                if (transfer.Currency == ClientCurrency.HTG)
                    report.TotalTransfersInHTG += transfer.Amount;
                else
                    report.TotalTransfersInUSD += transfer.Amount;
            }
        }

    }

        private static Currency MapSavingsCurrency(SavingsCurrency currency)
        {
            return currency == SavingsCurrency.USD ? Currency.USD : Currency.HTG;
        }

        private static Currency MapClientCurrency(ClientCurrency currency)
        {
            return currency == ClientCurrency.USD ? Currency.USD : Currency.HTG;
        }

        private static string BuildUserDisplayName(User? user)
        {
            if (user == null)
                return "N/A";

            var fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (!string.IsNullOrWhiteSpace(fullName))
                return fullName;

            if (!string.IsNullOrWhiteSpace(user.UserName))
                return user.UserName!;

            return "N/A";
        }

    public async Task<MonthlyBranchReportDto> GenerateMonthlyReportAsync(int branchId, int month, int year)
    {
        var branch = await _context.Branches.FindAsync(branchId);
        if (branch == null)
            throw new KeyNotFoundException($"Succursale avec ID {branchId} introuvable");

        var startDate = new DateTime(year, month, 1);
        var endDate = startDate.AddMonths(1);

        var report = new MonthlyBranchReportDto
        {
            BranchId = branchId,
            BranchName = branch.Name,
            Month = month,
            Year = year
        };

        // Générer les rapports journaliers pour chaque jour du mois
        for (var date = startDate; date < endDate; date = date.AddDays(1))
        {
            var dailyReport = await GenerateDailyReportAsync(branchId, date);
            report.DailyReports.Add(dailyReport);

            // Accumuler les totaux mensuels
            report.TotalCreditsDisbursedHTG += dailyReport.TotalCreditsDisbursedHTG;
            report.TotalCreditsDisbursedUSD += dailyReport.TotalCreditsDisbursedUSD;
            report.TotalCreditsCount += dailyReport.CreditsDisbursedCount;

            report.TotalPaymentsReceivedHTG += dailyReport.TotalPaymentsReceivedHTG;
            report.TotalPaymentsReceivedUSD += dailyReport.TotalPaymentsReceivedUSD;
            report.TotalPaymentsCount += dailyReport.PaymentsReceivedCount;

            report.TotalDepositsHTG += dailyReport.TotalDepositsHTG;
            report.TotalDepositsUSD += dailyReport.TotalDepositsUSD;
            report.TotalDepositsCount += dailyReport.DepositsCount;

            report.TotalWithdrawalsHTG += dailyReport.TotalWithdrawalsHTG;
            report.TotalWithdrawalsUSD += dailyReport.TotalWithdrawalsUSD;
            report.TotalWithdrawalsCount += dailyReport.WithdrawalsCount;
        }

        // Calculer les métriques de performance
        // Count new customers through their accounts in this branch
        report.NewCustomers = await _context.Accounts
            .Where(a => a.BranchId == branchId &&
                       a.CreatedAt >= startDate &&
                       a.CreatedAt < endDate)
            .Select(a => a.CustomerId)
            .Distinct()
            .CountAsync();

        report.ActiveLoans = await _context.Credits
            .Include(c => c.Account)
            .Where(c => c.Account.BranchId == branchId &&
                       c.Status == CreditStatus.Active)
            .CountAsync();

        // Portfolio at Risk (PAR) - Prêts en retard de plus de 30 jours
        var loansAtRisk = await _context.Credits
            .Include(c => c.Account)
            .Where(c => c.Account.BranchId == branchId &&
                       c.Status == CreditStatus.Active &&
                       c.DaysInArrears > 30)
            .SumAsync(c => c.OutstandingBalance);

        var totalPortfolio = await _context.Credits
            .Include(c => c.Account)
            .Where(c => c.Account.BranchId == branchId &&
                       c.Status == CreditStatus.Active)
            .SumAsync(c => c.OutstandingBalance);

        report.PortfolioAtRisk = totalPortfolio > 0 ? (loansAtRisk / totalPortfolio) * 100 : 0;

        // Taux de recouvrement
        var expectedPayments = await _context.Credits
            .Include(c => c.Account)
            .Where(c => c.Account.BranchId == branchId &&
                       c.Status == CreditStatus.Active)
            .SumAsync(c => c.WeeklyPayment * c.TermWeeks);

        report.CollectionRate = expectedPayments > 0 ? 
            (report.TotalPaymentsReceivedHTG / expectedPayments) * 100 : 0;

        return report;
    }

    public async Task<BranchPerformanceComparisonDto> GeneratePerformanceComparisonAsync(DateTime startDate, DateTime endDate)
    {
        var comparison = new BranchPerformanceComparisonDto
        {
            StartDate = startDate,
            EndDate = endDate
        };

        var branches = await _context.Branches
            .OrderBy(b => b.Name)
            .ToListAsync();

        foreach (var branch in branches)
        {
            var performance = new BranchPerformanceDto
            {
                BranchId = branch.Id,
                BranchName = branch.Name,
                Region = branch.Region
            };

            // Décaissements
            var regularDisbursements = await _context.Credits
                .Include(c => c.Account)
                .Include(c => c.Application)
                .Where(c => c.Account.BranchId == branch.Id &&
                           c.DisbursementDate >= startDate &&
                           c.DisbursementDate < endDate)
                .GroupBy(c => c.Application.Currency)
                .Select(g => new { Currency = g.Key, Total = g.Sum(c => c.PrincipalAmount) })
                .ToListAsync();

            performance.TotalDisbursementsHTG = regularDisbursements
                .FirstOrDefault(d => d.Currency == Currency.HTG)?.Total ?? 0;
            performance.TotalDisbursementsUSD = regularDisbursements
                .FirstOrDefault(d => d.Currency == Currency.USD)?.Total ?? 0;

            // Collections
            var regularCollections = await _context.CreditPayments
                .Include(p => p.Credit)
                    .ThenInclude(c => c.Account)
                .Include(p => p.Credit)
                    .ThenInclude(c => c.Application)
                .Where(p => p.Credit.Account.BranchId == branch.Id &&
                           p.PaymentDate >= startDate &&
                           p.PaymentDate < endDate)
                .GroupBy(p => p.Credit.Application.Currency)
                .Select(g => new { Currency = g.Key, Total = g.Sum(p => p.Amount) })
                .ToListAsync();

            performance.TotalCollectionsHTG = regularCollections
                .FirstOrDefault(c => c.Currency == Currency.HTG)?.Total ?? 0;
            performance.TotalCollectionsUSD = regularCollections
                .FirstOrDefault(c => c.Currency == Currency.USD)?.Total ?? 0;

            // Métriques
            performance.NumberOfActiveLoans = await _context.Credits
                .Include(c => c.Account)
                .Where(c => c.Account.BranchId == branch.Id &&
                           c.Status == CreditStatus.Active)
                .CountAsync();

            performance.NumberOfCustomers = await _context.Accounts
                .Where(a => a.BranchId == branch.Id)
                .Select(a => a.CustomerId)
                .Distinct()
                .CountAsync();

            performance.NumberOfEmployees = await _context.Users
                .Where(u => u.BranchId == branch.Id)
                .CountAsync();

            // PAR
            var loansAtRisk = await _context.Credits
                .Include(c => c.Account)
                .Where(c => c.Account.BranchId == branch.Id &&
                           c.Status == CreditStatus.Active &&
                           c.DaysInArrears > 30)
                .SumAsync(c => c.OutstandingBalance);

            var totalPortfolio = await _context.Credits
                .Include(c => c.Account)
                .Where(c => c.Account.BranchId == branch.Id &&
                           c.Status == CreditStatus.Active)
                .SumAsync(c => c.OutstandingBalance);

            performance.PortfolioAtRisk = totalPortfolio > 0 ? (loansAtRisk / totalPortfolio) * 100 : 0;

            // Taux de recouvrement
            var expectedPayments = performance.TotalDisbursementsHTG + performance.TotalDisbursementsUSD;
            var actualCollections = performance.TotalCollectionsHTG + performance.TotalCollectionsUSD;
            performance.CollectionRate = expectedPayments > 0 ? (actualCollections / expectedPayments) * 100 : 0;

            comparison.Branches.Add(performance);
        }

        // Calculer les rangs basés sur les collections totales
        comparison.Branches = comparison.Branches
            .OrderByDescending(b => b.TotalCollectionsHTG + b.TotalCollectionsUSD)
            .Select((b, index) => { b.Rank = index + 1; return b; })
            .ToList();

        return comparison;
    }

    public async Task<DailyBranchReportDto> GenerateCustomReportAsync(BranchReportRequestDto request)
    {
        if (request.EndDate <= request.StartDate)
            throw new ArgumentException("La date de fin doit être après la date de début");

        var branch = await _context.Branches.FindAsync(request.BranchId);
        if (branch == null)
            throw new KeyNotFoundException($"Succursale avec ID {request.BranchId} introuvable");

        var report = new DailyBranchReportDto
        {
            BranchId = request.BranchId,
            BranchName = branch.Name,
            ReportDate = request.StartDate
        };

        // Crédits décaissés
        await PopulateCreditsDisbursedAsync(report, request.BranchId, request.StartDate, request.EndDate);

        // Paiements de crédits reçus
        await PopulatePaymentsReceivedAsync(report, request.BranchId, request.StartDate, request.EndDate);

        // Dépôts et retraits
        await PopulateDepositsAndWithdrawalsAsync(report, request.BranchId, request.StartDate, request.EndDate);

        // Solde de caisse
        await PopulateCashBalanceAsync(report, request.BranchId, request.StartDate, request.EndDate);

        // Transferts inter-succursales
        await PopulateInterBranchTransfersAsync(report, request.BranchId, request.StartDate, request.EndDate);

        // Statistiques générales
        report.TotalTransactions = report.DepositsCount + report.WithdrawalsCount + 
                                   report.PaymentsReceivedCount + report.CreditsDisbursedCount;

        return report;
    }

    // ==================== MÉTHODES SUPERADMIN ====================

    public async Task<SuperAdminConsolidatedReportDto> GenerateConsolidatedReportAsync(DateTime startDate, DateTime endDate)
    {
        var report = new SuperAdminConsolidatedReportDto
        {
            ReportDate = DateTime.UtcNow,
            StartDate = startDate,
            EndDate = endDate
        };

        // Obtenir toutes les succursales
        var branches = await _context.Branches.ToListAsync();
        report.TotalBranches = branches.Count;

        // Générer les rapports pour chaque succursale
        foreach (var branch in branches)
        {
            var branchReport = await GenerateDailyReportAsync(branch.Id, startDate);
            report.BranchReports.Add(branchReport);

            // Agréger les totaux
            report.TotalCreditsDisbursedHTG += branchReport.TotalCreditsDisbursedHTG;
            report.TotalCreditsDisbursedUSD += branchReport.TotalCreditsDisbursedUSD;
            report.TotalCreditsDisbursedCount += branchReport.CreditsDisbursedCount;

            report.TotalPaymentsReceivedHTG += branchReport.TotalPaymentsReceivedHTG;
            report.TotalPaymentsReceivedUSD += branchReport.TotalPaymentsReceivedUSD;
            report.TotalPaymentsReceivedCount += branchReport.PaymentsReceivedCount;

            report.TotalDepositsHTG += branchReport.TotalDepositsHTG;
            report.TotalDepositsUSD += branchReport.TotalDepositsUSD;
            report.TotalDepositsCount += branchReport.DepositsCount;

            report.TotalWithdrawalsHTG += branchReport.TotalWithdrawalsHTG;
            report.TotalWithdrawalsUSD += branchReport.TotalWithdrawalsUSD;
            report.TotalWithdrawalsCount += branchReport.WithdrawalsCount;

            report.TotalCashBalanceHTG += branchReport.CashBalance.ClosingBalanceHTG;
            report.TotalCashBalanceUSD += branchReport.CashBalance.ClosingBalanceUSD;
        }

        // Statistiques globales
        report.TotalActiveCustomers = await _context.Customers
            .Where(c => c.IsActive)
            .CountAsync();

        report.TotalActiveLoans = await _context.Credits
            .Where(c => c.Status == CreditStatus.Active)
            .CountAsync();

        report.TotalEmployees = await _context.Users.CountAsync();

        // Portfolio at Risk global
        var totalLoansAtRisk = await _context.Credits
            .Where(c => c.Status == CreditStatus.Active && c.DaysInArrears > 30)
            .SumAsync(c => c.OutstandingBalance);

        var totalPortfolio = await _context.Credits
            .Where(c => c.Status == CreditStatus.Active)
            .SumAsync(c => c.OutstandingBalance);

        report.GlobalPortfolioAtRisk = totalPortfolio > 0 ? (totalLoansAtRisk / totalPortfolio) * 100 : 0;

        // Taux de recouvrement global
        var totalExpected = report.TotalCreditsDisbursedHTG + report.TotalCreditsDisbursedUSD;
        var totalCollected = report.TotalPaymentsReceivedHTG + report.TotalPaymentsReceivedUSD;
        report.GlobalCollectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

        // Générer la comparaison de performance
        var performanceComparison = await GeneratePerformanceComparisonAsync(startDate, endDate);
        report.TopPerformers = performanceComparison.Branches.Take(5).ToList();

        // Générer les alertes
        report.Alerts = await GenerateAlertsAsync(branches);

        return report;
    }

    public async Task<SuperAdminTransactionAuditDto> GetTransactionAuditAsync(
        DateTime startDate, 
        DateTime endDate, 
        int? branchId = null, 
        string? transactionType = null, 
        string? userId = null)
    {
        var query = _context.Transactions
            .Include(t => t.Account)
                .ThenInclude(a => a.Customer)
            .Include(t => t.Branch)
            .Include(t => t.User)
            .Include(t => t.CashSession)
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt < endDate)
            .AsQueryable();

        // Appliquer les filtres
        if (branchId.HasValue)
            query = query.Where(t => t.BranchId == branchId.Value);

        if (!string.IsNullOrEmpty(transactionType))
        {
            if (Enum.TryParse<TransactionType>(transactionType, out var type))
                query = query.Where(t => t.Type == type);
            }

        if (!string.IsNullOrEmpty(userId))
            query = query.Where(t => t.UserId == userId);

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(1000) // Limiter à 1000 transactions pour la performance
            .ToListAsync();

        var audit = new SuperAdminTransactionAuditDto
        {
            StartDate = startDate,
            EndDate = endDate,
            BranchId = branchId,
            TransactionType = transactionType,
            UserId = userId,
            TotalTransactions = transactions.Count
        };

        foreach (var transaction in transactions)
        {
            var userRoles = await _context.UserRoles
                .Where(ur => ur.UserId == transaction.UserId)
                .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                .FirstOrDefaultAsync();

            audit.Transactions.Add(new TransactionAuditDetailDto
            {
                TransactionId = transaction.Id,
                TransactionNumber = transaction.TransactionNumber,
                TransactionType = transaction.Type.ToString(),
                BranchId = transaction.BranchId,
                BranchName = transaction.Branch.Name,
                UserId = transaction.UserId,
                UserName = transaction.User != null ? $"{transaction.User.FirstName} {transaction.User.LastName}" : "N/A",
                UserRole = userRoles ?? "N/A",
                CustomerName = $"{transaction.Account.Customer.FirstName} {transaction.Account.Customer.LastName}",
                AccountNumber = transaction.Account.AccountNumber,
                Amount = transaction.Amount,
                Currency = transaction.Currency.ToString(),
                Status = transaction.Status.ToString(),
                TransactionDate = transaction.CreatedAt,
                Description = transaction.Description,
                Reference = transaction.Reference,
                CashSessionId = transaction.CashSessionId,
                CashierName = transaction.CashSession?.User != null ? $"{transaction.CashSession.User.FirstName} {transaction.CashSession.User.LastName}" : null
            });

            if (transaction.Currency == Currency.HTG)
                audit.TotalAmountHTG += transaction.Amount;
            else
                audit.TotalAmountUSD += transaction.Amount;
        }

        return audit;
    }

    public async Task<SuperAdminDashboardStatsDto> GetDashboardStatsAsync()
    {
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var stats = new SuperAdminDashboardStatsDto
        {
            AsOfDate = DateTime.UtcNow
        };

        // Statistiques d'aujourd'hui
        var todayCredits = await _context.Credits
            .Include(c => c.Account)
            .Include(c => c.Application)
            .Where(c => c.DisbursementDate >= today && c.DisbursementDate < tomorrow)
            .ToListAsync();

        stats.TodayDisbursementsHTG = todayCredits
            .Where(c => c.Application.Currency == Currency.HTG)
            .Sum(c => c.PrincipalAmount);
        stats.TodayDisbursementsUSD = todayCredits
            .Where(c => c.Application.Currency == Currency.USD)
            .Sum(c => c.PrincipalAmount);

        var todayPayments = await _context.CreditPayments
            .Include(p => p.Credit)
                .ThenInclude(c => c.Account)
            .Include(p => p.Credit)
                .ThenInclude(c => c.Application)
            .Where(p => p.PaymentDate >= today && p.PaymentDate < tomorrow)
            .ToListAsync();

        stats.TodayCollectionsHTG = todayPayments
            .Where(p => p.Credit.Application.Currency == Currency.HTG)
            .Sum(p => p.Amount);
        stats.TodayCollectionsUSD = todayPayments
            .Where(p => p.Credit.Application.Currency == Currency.USD)
            .Sum(p => p.Amount);

        stats.TodayTransactionsCount = await _context.Transactions
            .Where(t => t.CreatedAt >= today && t.CreatedAt < tomorrow)
            .CountAsync();

        // Statistiques du mois
        var monthCredits = await _context.Credits
            .Include(c => c.Account)
            .Include(c => c.Application)
            .Where(c => c.DisbursementDate >= monthStart && c.DisbursementDate < tomorrow)
            .ToListAsync();

        stats.MonthToDateDisbursementsHTG = monthCredits
            .Where(c => c.Application.Currency == Currency.HTG)
            .Sum(c => c.PrincipalAmount);
        stats.MonthToDateDisbursementsUSD = monthCredits
            .Where(c => c.Application.Currency == Currency.USD)
            .Sum(c => c.PrincipalAmount);

        var monthPayments = await _context.CreditPayments
            .Include(p => p.Credit)
                .ThenInclude(c => c.Account)
            .Include(p => p.Credit)
                .ThenInclude(c => c.Application)
            .Where(p => p.PaymentDate >= monthStart && p.PaymentDate < tomorrow)
            .ToListAsync();

        stats.MonthToDateCollectionsHTG = monthPayments
            .Where(p => p.Credit.Application.Currency == Currency.HTG)
            .Sum(p => p.Amount);
        stats.MonthToDateCollectionsUSD = monthPayments
            .Where(p => p.Credit.Application.Currency == Currency.USD)
            .Sum(p => p.Amount);

        // Portfolio
        var activeLoans = await _context.Credits
            .Where(c => c.Status == CreditStatus.Active)
            .Include(c => c.Account)
            .Include(c => c.Application)
            .ToListAsync();

        stats.TotalActiveLoans = activeLoans.Count;
        stats.TotalOutstandingPortfolioHTG = activeLoans
            .Where(c => c.Application.Currency == Currency.HTG)
            .Sum(c => c.OutstandingBalance);
        stats.TotalOutstandingPortfolioUSD = activeLoans
            .Where(c => c.Application.Currency == Currency.USD)
            .Sum(c => c.OutstandingBalance);

        var loansAtRisk = activeLoans.Where(c => c.DaysInArrears > 30).Sum(c => c.OutstandingBalance);
        var totalPortfolio = activeLoans.Sum(c => c.OutstandingBalance);
        stats.GlobalPAR = totalPortfolio > 0 ? (loansAtRisk / totalPortfolio) * 100 : 0;

        // Succursales
        stats.ActiveBranches = await _context.Branches.CountAsync();
        stats.ActiveCashSessions = await _context.CashSessions
            .Where(cs => cs.Status == CashSessionStatus.Open)
            .CountAsync();

        // Top 5 succursales aujourd'hui
        var branchStats = await _context.Transactions
            .Where(t => t.CreatedAt >= today && t.CreatedAt < tomorrow)
            .Include(t => t.Branch)
            .GroupBy(t => new { t.BranchId, t.Branch.Name })
            .Select(g => new
            {
                BranchId = g.Key.BranchId,
                BranchName = g.Key.Name,
                TodayCollections = g.Sum(t => t.Amount),
                TodayTransactions = g.Count()
            })
            .OrderByDescending(b => b.TodayCollections)
            .Take(5)
            .ToListAsync();

        foreach (var branchStat in branchStats)
        {
            var branchLoans = activeLoans.Where(l => l.Account.BranchId == branchStat.BranchId).ToList();
            var branchPAR = branchLoans.Any() 
                ? (branchLoans.Where(l => l.DaysInArrears > 30).Sum(l => l.OutstandingBalance) / branchLoans.Sum(l => l.OutstandingBalance)) * 100 
                : 0;

            var status = branchPAR < 5 ? "EXCELLENT" : branchPAR < 10 ? "GOOD" : branchPAR < 15 ? "WARNING" : "CRITICAL";

            stats.TopBranches.Add(new BranchQuickStatsDto
            {
                BranchId = branchStat.BranchId,
                BranchName = branchStat.BranchName,
                TodayCollections = branchStat.TodayCollections,
                TodayTransactions = branchStat.TodayTransactions,
                CollectionRate = 95.0m,
                PAR = branchPAR,
                Status = status
            });
        }

        // Compter les alertes
        var allBranches = await _context.Branches.ToListAsync();
        var alerts = await GenerateAlertsAsync(allBranches);
        stats.CriticalAlerts = alerts.Count(a => a.Severity == "CRITICAL");
        stats.HighAlerts = alerts.Count(a => a.Severity == "HIGH");
        stats.MediumAlerts = alerts.Count(a => a.Severity == "MEDIUM");

        return stats;
    }

    private async Task<List<BranchAlertDto>> GenerateAlertsAsync(List<Branch> branches)
    {
        var alerts = new List<BranchAlertDto>();

        foreach (var branch in branches)
        {
            // Vérifier PAR
            var branchLoans = await _context.Credits
                .Include(c => c.Account)
                .Where(c => c.Account.BranchId == branch.Id && c.Status == CreditStatus.Active)
                .ToListAsync();

            if (branchLoans.Any())
            {
                var loansAtRisk = branchLoans.Where(l => l.DaysInArrears > 30).Sum(l => l.OutstandingBalance);
                var totalPortfolio = branchLoans.Sum(l => l.OutstandingBalance);
                var par = totalPortfolio > 0 ? (loansAtRisk / totalPortfolio) * 100 : 0;

                if (par > 15)
                {
                    alerts.Add(new BranchAlertDto
                    {
                        BranchId = branch.Id,
                        BranchName = branch.Name,
                        AlertType = "PAR_HIGH",
                        Severity = "CRITICAL",
                        Message = $"Portfolio at Risk très élevé: {par:F2}%",
                        Value = par,
                        Threshold = 15,
                        DetectedAt = DateTime.UtcNow
                    });
                }
                else if (par > 10)
                {
                    alerts.Add(new BranchAlertDto
                    {
                        BranchId = branch.Id,
                        BranchName = branch.Name,
                        AlertType = "PAR_HIGH",
                        Severity = "HIGH",
                        Message = $"Portfolio at Risk élevé: {par:F2}%",
                        Value = par,
                        Threshold = 10,
                        DetectedAt = DateTime.UtcNow
                    });
                }
            }

            // Vérifier taux de recouvrement
            var today = DateTime.Today;
            var monthStart = new DateTime(today.Year, today.Month, 1);

            var monthPayments = await _context.CreditPayments
                .Include(p => p.Credit)
                    .ThenInclude(c => c.Account)
                .Where(p => p.Credit.Account.BranchId == branch.Id &&
                           p.PaymentDate >= monthStart &&
                           p.PaymentDate < today.AddDays(1))
                .SumAsync(p => p.Amount);

            var monthDisbursements = await _context.Credits
                .Include(c => c.Account)
                .Where(c => c.Account.BranchId == branch.Id &&
                           c.DisbursementDate >= monthStart &&
                           c.DisbursementDate < today.AddDays(1))
                .SumAsync(c => c.PrincipalAmount);

            if (monthDisbursements > 0)
            {
                var collectionRate = (monthPayments / monthDisbursements) * 100;

                if (collectionRate < 85)
                {
                    alerts.Add(new BranchAlertDto
                    {
                        BranchId = branch.Id,
                        BranchName = branch.Name,
                        AlertType = "COLLECTION_LOW",
                        Severity = collectionRate < 75 ? "CRITICAL" : "HIGH",
                        Message = $"Taux de recouvrement bas: {collectionRate:F2}%",
                        Value = collectionRate,
                        Threshold = 90,
                        DetectedAt = DateTime.UtcNow
                    });
                }
            }

            // Vérifier écart de caisse
            var activeCashSessions = await _context.CashSessions
                .Where(cs => cs.BranchId == branch.Id && cs.Status == CashSessionStatus.Open)
                .ToListAsync();

            if (activeCashSessions.Count > 5)
            {
                alerts.Add(new BranchAlertDto
                {
                    BranchId = branch.Id,
                    BranchName = branch.Name,
                    AlertType = "CASH_DISCREPANCY",
                    Severity = "MEDIUM",
                    Message = $"Nombre élevé de sessions de caisse ouvertes: {activeCashSessions.Count}",
                    Value = activeCashSessions.Count,
                    Threshold = 5,
                    DetectedAt = DateTime.UtcNow
                });
            }
        }

        return alerts.OrderByDescending(a => a.Severity).ToList();
    }
}
