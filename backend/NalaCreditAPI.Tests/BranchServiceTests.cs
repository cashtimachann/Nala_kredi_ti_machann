using System;
using System.Threading.Tasks;
using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NalaCreditAPI.Data;
using NalaCreditAPI.Services;
using NalaCreditAPI.DTOs;
using NalaCreditAPI.Models;
using System.Collections.Generic;

namespace NalaCreditAPI.Tests
{
    public class BranchServiceTests
    {
        private ApplicationDbContext CreateInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new ApplicationDbContext(options);
        }

        private BranchService CreateService(ApplicationDbContext ctx)
        {
            var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            var logger = loggerFactory.CreateLogger<BranchService>();
            return new BranchService(ctx, logger);
        }

        [Fact]
        public async Task CreateBranch_InvalidOpeningDate_FallbackToUtcNow()
        {
            var ctx = CreateInMemoryContext();
            var service = CreateService(ctx);

            var dto = new CreateBranchDto
            {
                Name = "Test Branch",
                Address = "Addr",
                Commune = "Commune",
                Department = "Dept",
                Phones = new List<string> { "+509 1111" },
                Email = "test@branch.com",
                OpeningDate = "not-a-date",
                MaxEmployees = 10,
                Status = "Active",
                Limits = new BranchLimitsDto
                {
                    DailyWithdrawalLimit = 1,
                    DailyDepositLimit = 1,
                    MaxLocalCreditApproval = 1,
                    MinCashReserveHTG = 1,
                    MinCashReserveUSD = 1
                },
                OperatingHours = new OperatingHoursDto
                {
                    OpenTime = "08:00",
                    CloseTime = "17:00",
                    ClosedDays = new List<int>()
                }
            };

            var before = DateTime.UtcNow.AddMinutes(-2);
            var branchDto = await service.CreateBranchAsync(dto);
            Assert.NotNull(branchDto);
            // OpeningDate should be a valid yyyy-MM-dd date string
            Assert.Matches("^\\d{4}-\\d{2}-\\d{2}$", branchDto.OpeningDate);
            var parsed = DateTime.Parse(branchDto.OpeningDate);
            Assert.True(parsed >= before.AddDays(-1));
        }

        [Fact]
        public async Task UpdateBranch_ValidTimes_ParsesSuccessfully()
        {
            var ctx = CreateInMemoryContext();
            var service = CreateService(ctx);
            // First create a valid branch
            var createDto = new CreateBranchDto
            {
                Name = "Branch",
                Address = "Addr",
                Commune = "Commune",
                Department = "Dept",
                Phones = new List<string>(),
                Email = "b@b.com",
                OpeningDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                MaxEmployees = 5,
                Status = "Active",
                Limits = new BranchLimitsDto
                {
                    DailyWithdrawalLimit = 1,
                    DailyDepositLimit = 1,
                    MaxLocalCreditApproval = 1,
                    MinCashReserveHTG = 1,
                    MinCashReserveUSD = 1
                },
                OperatingHours = new OperatingHoursDto { OpenTime = "08:00", CloseTime = "17:00", ClosedDays = new List<int>() }
            };
            var created = await service.CreateBranchAsync(createDto);

            var updateDto = new UpdateBranchDto
            {
                Id = created.Id,
                OperatingHours = new OperatingHoursDto { OpenTime = "09:30", CloseTime = "18:15", ClosedDays = new List<int>() },
                Limits = new BranchLimitsDto(),
                OpeningDate = created.OpeningDate // keep same
            };

            var updated = await service.UpdateBranchAsync(created.Id, updateDto);
            Assert.Equal("09:30", updated.OperatingHours.OpenTime);
            Assert.Equal("18:15", updated.OperatingHours.CloseTime);
        }
    }
}
