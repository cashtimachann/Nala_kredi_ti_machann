using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services.ClientAccounts;
using NalaCreditAPI.DTOs.ClientAccounts;
using System;
using System.Threading.Tasks;
using Xunit;

namespace NalaCreditAPI.UnitTests
{
    public class TermSavingsAccountServiceTests
    {
        private async Task<ApplicationDbContext> CreateInMemoryDbContextAsync()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            var context = new ApplicationDbContext(options);
            await context.Database.EnsureCreatedAsync();
            return context;
        }

        [Fact]
        public async Task OpenAccount_WithMonthlyRate_StoresAnnualAndReturnsMonthly()
        {
            var context = await CreateInMemoryDbContextAsync();

            // Seed required branch and customer
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var savingsCustomer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Test", LastName = "Customer", PrimaryPhone = "555-0000" };
            context.SavingsCustomers.Add(savingsCustomer);
            await context.SaveChangesAsync();

            var service = new TermSavingsAccountService(context);

            var dto = new TermSavingsAccountOpeningDto
            {
                CustomerId = savingsCustomer.Id,
                Currency = ClientCurrency.HTG,
                InitialDeposit = 1000m,
                BranchId = 1,
                TermType = TermSavingsType.TwelveMonths,
                InterestRateMonthly = 0.015m // 1.5% per month
            };

            var result = await service.OpenAccountAsync(dto, "test-user");

            // Expect stored annual = monthly * 12 = 0.18
            Assert.Equal(0.18m, result.InterestRate);
            // Expect returned monthly = annual / 12 = 0.015
            Assert.Equal(0.015m, result.InterestRateMonthly);
        }
    }
}
