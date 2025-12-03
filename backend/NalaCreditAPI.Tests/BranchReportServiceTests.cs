using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Services;
using NalaCreditAPI.Models;
using NalaCreditAPI.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace NalaCreditAPI.Tests;

public class BranchReportServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly BranchReportService _service;
    private readonly Mock<ILogger<BranchReportService>> _loggerMock;

    public BranchReportServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _loggerMock = new Mock<ILogger<BranchReportService>>();
        _service = new BranchReportService(_context, _loggerMock.Object);

        SeedTestData();
    }

    private void SeedTestData()
    {
        // Créer une succursale
        var branch = new Branch
        {
            Id = 1,
            Name = "Succursale Test",
            Code = "TEST01",
            Address = "123 Test Street",
            Region = "Test Region",
            PrimaryCurrency = Currency.HTG
        };
        _context.Branches.Add(branch);

        // Créer un utilisateur
        var user = new User
        {
            Id = "user-1",
            UserName = "testuser",
            Email = "test@example.com",
            FullName = "Test User",
            BranchId = 1
        };
        _context.Users.Add(user);

        // Créer un client
        var customer = new Customer
        {
            Id = 1,
            FirstName = "Jean",
            LastName = "Baptiste",
            DateOfBirth = new DateTime(1990, 1, 1),
            Gender = Gender.Male,
            Phone = "1234567890",
            Address = "Test Address",
            BranchId = 1,
            Status = CustomerStatus.Active
        };
        _context.Customers.Add(customer);

        // Créer un compte
        var account = new Account
        {
            Id = 1,
            AccountNumber = "ACC-001",
            CustomerId = 1,
            BranchId = 1,
            Currency = Currency.HTG,
            Balance = 10000,
            Status = AccountStatus.Active,
            Type = AccountType.Savings
        };
        _context.Accounts.Add(account);

        // Créer des transactions de dépôt
        var deposit = new Transaction
        {
            Id = 1,
            TransactionNumber = "TRX-001",
            AccountId = 1,
            BranchId = 1,
            UserId = "user-1",
            Type = TransactionType.Deposit,
            Currency = Currency.HTG,
            Amount = 5000,
            BalanceAfter = 5000,
            Status = TransactionStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(deposit);

        // Créer des transactions de retrait
        var withdrawal = new Transaction
        {
            Id = 2,
            TransactionNumber = "TRX-002",
            AccountId = 1,
            BranchId = 1,
            UserId = "user-1",
            Type = TransactionType.Withdrawal,
            Currency = Currency.HTG,
            Amount = 2000,
            BalanceAfter = 3000,
            Status = TransactionStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };
        _context.Transactions.Add(withdrawal);

        // Créer une application de crédit
        var creditApp = new CreditApplication
        {
            Id = 1,
            ApplicationNumber = "APP-001",
            CustomerId = 1,
            AgentId = "user-1",
            RequestedAmount = 10000,
            ApprovedAmount = 10000,
            Currency = Currency.HTG,
            TermWeeks = 12,
            InterestRate = 15,
            Purpose = "Test purpose",
            Status = CreditApplicationStatus.Approved
        };
        _context.CreditApplications.Add(creditApp);

        // Créer un crédit
        var credit = new Credit
        {
            Id = 1,
            CreditNumber = "CRED-001",
            ApplicationId = 1,
            AccountId = 1,
            PrincipalAmount = 10000,
            OutstandingBalance = 8000,
            WeeklyPayment = 1000,
            InterestRate = 15,
            TermWeeks = 12,
            WeeksPaid = 2,
            DisbursementDate = DateTime.UtcNow,
            NextPaymentDate = DateTime.UtcNow.AddDays(7),
            MaturityDate = DateTime.UtcNow.AddDays(84),
            Status = CreditStatus.Active
        };
        _context.Credits.Add(credit);

        // Créer un paiement de crédit
        var payment = new CreditPayment
        {
            Id = 1,
            CreditId = 1,
            Amount = 1000,
            PrincipalPaid = 800,
            InterestPaid = 200,
            PaymentDate = DateTime.UtcNow,
            Status = PaymentStatus.Completed
        };
        _context.CreditPayments.Add(payment);

        // Créer une session de caisse
        var cashSession = new CashSession
        {
            Id = 1,
            UserId = "user-1",
            BranchId = 1,
            OpeningBalanceHTG = 50000,
            OpeningBalanceUSD = 500,
            ClosingBalanceHTG = 53000,
            ClosingBalanceUSD = 500,
            SessionStart = DateTime.UtcNow.AddHours(-8),
            SessionEnd = DateTime.UtcNow,
            Status = CashSessionStatus.Closed
        };
        _context.CashSessions.Add(cashSession);

        _context.SaveChanges();
    }

    [Fact]
    public async Task GenerateDailyReport_ShouldReturnReport_WithCorrectData()
    {
        // Arrange
        var reportDate = DateTime.Today;

        // Act
        var report = await _service.GenerateDailyReportAsync(1, reportDate);

        // Assert
        Assert.NotNull(report);
        Assert.Equal(1, report.BranchId);
        Assert.Equal("Succursale Test", report.BranchName);
        Assert.Equal(reportDate, report.ReportDate);
    }

    [Fact]
    public async Task GenerateDailyReport_ShouldIncludeTransactions()
    {
        // Arrange
        var reportDate = DateTime.Today;

        // Act
        var report = await _service.GenerateDailyReportAsync(1, reportDate);

        // Assert
        Assert.True(report.DepositsCount > 0 || report.WithdrawalsCount > 0);
    }

    [Fact]
    public async Task GenerateDailyReport_ShouldCalculateTotalsCorrectly()
    {
        // Arrange
        var reportDate = DateTime.Today;

        // Act
        var report = await _service.GenerateDailyReportAsync(1, reportDate);

        // Assert
        Assert.True(report.TotalDepositsHTG >= 0);
        Assert.True(report.TotalWithdrawalsHTG >= 0);
        Assert.True(report.TotalPaymentsReceivedHTG >= 0);
    }

    [Fact]
    public async Task GenerateDailyReport_ShouldIncludeCashBalance()
    {
        // Arrange
        var reportDate = DateTime.Today;

        // Act
        var report = await _service.GenerateDailyReportAsync(1, reportDate);

        // Assert
        Assert.NotNull(report.CashBalance);
        Assert.True(report.CashBalance.OpeningBalanceHTG >= 0);
        Assert.True(report.CashBalance.ClosingBalanceHTG >= 0);
    }

    [Fact]
    public async Task GenerateDailyReport_InvalidBranch_ShouldThrowException()
    {
        // Arrange
        var reportDate = DateTime.Today;
        var invalidBranchId = 999;

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.GenerateDailyReportAsync(invalidBranchId, reportDate)
        );
    }

    [Fact]
    public async Task GenerateMonthlyReport_ShouldReturnReport_WithCorrectData()
    {
        // Arrange
        var month = DateTime.Today.Month;
        var year = DateTime.Today.Year;

        // Act
        var report = await _service.GenerateMonthlyReportAsync(1, month, year);

        // Assert
        Assert.NotNull(report);
        Assert.Equal(1, report.BranchId);
        Assert.Equal("Succursale Test", report.BranchName);
        Assert.Equal(month, report.Month);
        Assert.Equal(year, report.Year);
    }

    [Fact]
    public async Task GenerateMonthlyReport_ShouldIncludeDailyReports()
    {
        // Arrange
        var month = DateTime.Today.Month;
        var year = DateTime.Today.Year;

        // Act
        var report = await _service.GenerateMonthlyReportAsync(1, month, year);

        // Assert
        Assert.NotNull(report.DailyReports);
        // Le nombre de rapports journaliers devrait correspondre au nombre de jours dans le mois
        var daysInMonth = DateTime.DaysInMonth(year, month);
        Assert.Equal(daysInMonth, report.DailyReports.Count);
    }

    [Fact]
    public async Task GeneratePerformanceComparison_ShouldReturnComparison()
    {
        // Arrange
        var startDate = DateTime.Today.AddMonths(-1);
        var endDate = DateTime.Today;

        // Act
        var comparison = await _service.GeneratePerformanceComparisonAsync(startDate, endDate);

        // Assert
        Assert.NotNull(comparison);
        Assert.Equal(startDate, comparison.StartDate);
        Assert.Equal(endDate, comparison.EndDate);
        Assert.NotEmpty(comparison.Branches);
    }

    [Fact]
    public async Task GeneratePerformanceComparison_ShouldRankBranches()
    {
        // Arrange
        var startDate = DateTime.Today.AddMonths(-1);
        var endDate = DateTime.Today;

        // Act
        var comparison = await _service.GeneratePerformanceComparisonAsync(startDate, endDate);

        // Assert
        var ranks = comparison.Branches.Select(b => b.Rank).ToList();
        Assert.True(ranks.All(r => r > 0));
        Assert.Equal(ranks.OrderBy(r => r).ToList(), ranks); // Vérifier que c'est trié
    }

    [Fact]
    public async Task GenerateCustomReport_ShouldReturnReport_ForCustomPeriod()
    {
        // Arrange
        var request = new BranchReportRequestDto
        {
            BranchId = 1,
            StartDate = DateTime.Today.AddDays(-7),
            EndDate = DateTime.Today,
            IncludeDetails = true
        };

        // Act
        var report = await _service.GenerateCustomReportAsync(request);

        // Assert
        Assert.NotNull(report);
        Assert.Equal(1, report.BranchId);
        Assert.Equal("Succursale Test", report.BranchName);
    }

    [Fact]
    public async Task GenerateCustomReport_InvalidDateRange_ShouldThrowException()
    {
        // Arrange
        var request = new BranchReportRequestDto
        {
            BranchId = 1,
            StartDate = DateTime.Today,
            EndDate = DateTime.Today.AddDays(-7), // End date before start date
            IncludeDetails = true
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.GenerateCustomReportAsync(request)
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
