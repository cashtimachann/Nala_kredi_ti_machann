using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.DTOs;
using Xunit;

namespace NalaCreditAPI.UnitTests
{
    public class BranchServiceTests
    {
        private async Task<ApplicationDbContext> CreateInMemoryDbAsync()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            var ctx = new ApplicationDbContext(options);
            await ctx.Database.EnsureCreatedAsync();
            return ctx;
        }

        [Fact]
        public async Task UpdateBranchService_UpdatesOperatingHours()
        {
            var ctx = await CreateInMemoryDbAsync();
            // seed branch with defaults
            var branch = new Branch
            {
                Id = 1,
                Name = "TST",
                Address = "addr",
                Region = "Ouest",
                PrimaryCurrency = Currency.HTG,
                OpenTime = new TimeSpan(8,0,0),
                CloseTime = new TimeSpan(17,0,0)
            };
            ctx.Branches.Add(branch);
            await ctx.SaveChangesAsync();

            var svc = new BranchService(ctx, new NullLogger<BranchService>());

            var dto = new UpdateBranchDto
            {
                OperatingHours = new OperatingHoursDto
                {
                    OpenTime = "09:00",
                    CloseTime = "18:30"
                }
            };

            var result = await svc.UpdateBranchAsync(branch.Id, dto);

            Assert.Equal("09:00", result.OperatingHours.OpenTime);
            Assert.Equal("18:30", result.OperatingHours.CloseTime);

            // re-query to ensure persisted
            var saved = await ctx.Branches.FindAsync(branch.Id);
            Assert.Equal(new TimeSpan(9,0,0), saved!.OpenTime);
            Assert.Equal(new TimeSpan(18,30,0), saved.CloseTime);
        }

        [Fact]
        public async Task UpdateBranchController_UpdatesOperatingHours()
        {
            var ctx = await CreateInMemoryDbAsync();

            var branch = new Branch
            {
                Id = 2,
                Name = "TST2",
                Address = "addr2",
                Region = "Ouest",
                PrimaryCurrency = Currency.HTG,
                OpenTime = new TimeSpan(8,0,0),
                CloseTime = new TimeSpan(17,0,0)
            };
            ctx.Branches.Add(branch);
            await ctx.SaveChangesAsync();

            var controller = new NalaCreditAPI.Controllers.BranchController(ctx);

            var updateDto = new UpdateBranchDto
            {
                Name = "TST2",
                OperatingHours = new OperatingHoursDto
                {
                    OpenTime = "07:15",
                    CloseTime = "14:45"
                }
            };

            var action = await controller.UpdateBranch(branch.Id, updateDto);

            // after controller update, check DB
            var saved = await ctx.Branches.FindAsync(branch.Id);
            Assert.Equal(new TimeSpan(7,15,0), saved!.OpenTime);
            Assert.Equal(new TimeSpan(14,45,0), saved.CloseTime);
        }

        [Fact]
        public async Task UpdateBranchService_InvalidTimes_Throws()
        {
            var ctx = await CreateInMemoryDbAsync();
            var branch = new Branch
            {
                Id = 3,
                Name = "TST3",
                Address = "addr3",
                Region = "Ouest",
                PrimaryCurrency = Currency.HTG,
                OpenTime = new TimeSpan(8,0,0),
                CloseTime = new TimeSpan(17,0,0)
            };
            ctx.Branches.Add(branch);
            await ctx.SaveChangesAsync();

            var svc = new BranchService(ctx, new NullLogger<BranchService>());

            var dto = new UpdateBranchDto
            {
                OperatingHours = new OperatingHoursDto
                {
                    OpenTime = "bad-time",
                    CloseTime = "25:00"
                }
            };

            await Assert.ThrowsAsync<ArgumentException>(() => svc.UpdateBranchAsync(branch.Id, dto));
        }

        [Fact]
        public async Task UpdateBranchController_InvalidTimes_ReturnsBadRequest()
        {
            var ctx = await CreateInMemoryDbAsync();

            var branch = new Branch
            {
                Id = 4,
                Name = "TST4",
                Address = "addr4",
                Region = "Ouest",
                PrimaryCurrency = Currency.HTG,
                OpenTime = new TimeSpan(8,0,0),
                CloseTime = new TimeSpan(17,0,0)
            };
            ctx.Branches.Add(branch);
            await ctx.SaveChangesAsync();

            var controller = new NalaCreditAPI.Controllers.BranchController(ctx);

            var updateDto = new UpdateBranchDto
            {
                Name = "TST4",
                OperatingHours = new OperatingHoursDto
                {
                    OpenTime = "bad-time",
                    CloseTime = "25:00"
                }
            };

            var action = await controller.UpdateBranch(branch.Id, updateDto);
            Assert.IsType<Microsoft.AspNetCore.Mvc.BadRequestObjectResult>(action.Result);
        }
    }
}
