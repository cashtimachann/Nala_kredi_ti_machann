using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Xunit;
using NalaCreditAPI.Data;
using NalaCreditAPI.Controllers;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Tests
{
    public class CashSessionControllerTests
    {
        private ApplicationDbContext CreateInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new ApplicationDbContext(options);
        }

        private CashSessionController CreateController(ApplicationDbContext ctx)
        {
            var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            var logger = loggerFactory.CreateLogger<CashSessionController>();
            var controller = new CashSessionController(ctx, logger);
            return controller;
        }

        private ClaimsPrincipal CreateUserPrincipal(string userId)
        {
            var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
            var identity = new ClaimsIdentity(claims, "test");
            return new ClaimsPrincipal(identity);
        }

        [Fact]
        public async Task OpenCashSession_ExceedsBranchTotal_ReturnsBadRequest()
        {
            var ctx = CreateInMemoryContext();

            // Create branch
            var branch = new Branch { Name = "B1", Address = "Addr", Region = "R", PrimaryCurrency = Currency.HTG };
            ctx.Branches.Add(branch);
            await ctx.SaveChangesAsync();

            // Create cashier assigned to branch
            var cashier = new User { Id = "cashier-1", FirstName = "C", LastName = "User", Role = UserRole.Cashier, BranchId = branch.Id };
            ctx.Users.Add(cashier);

            // Create manager
            var manager = new User { Id = "manager-1", FirstName = "M", LastName = "Manager", Role = UserRole.Manager };
            ctx.Users.Add(manager);

            // Existing branch session with limited funds
            var existing = new CashSession
            {
                UserId = cashier.Id,
                BranchId = branch.Id,
                OpeningBalanceHTG = 1000m,
                OpeningBalanceUSD = 100m,
                ClosingBalanceHTG = 1000m,
                ClosingBalanceUSD = 100m,
                Status = CashSessionStatus.Closed,
                SessionStart = DateTime.UtcNow.AddHours(-2),
                SessionEnd = DateTime.UtcNow.AddHours(-1)
            };
            ctx.CashSessions.Add(existing);
            await ctx.SaveChangesAsync();

            var controller = CreateController(ctx);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(manager.Id) }
            };

            var dto = new OpenCashSessionForCashierDto
            {
                CashierId = cashier.Id,
                OpeningBalanceHTG = 2000m, // exceeds branch total 1000
                OpeningBalanceUSD = 50m
            };

            var result = await controller.OpenCashSessionForCashier(dto);

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task OpenCashSession_WithinBranchTotal_CreatesSession()
        {
            var ctx = CreateInMemoryContext();

            // Create branch
            var branch = new Branch { Name = "B2", Address = "Addr", Region = "R", PrimaryCurrency = Currency.HTG };
            ctx.Branches.Add(branch);
            await ctx.SaveChangesAsync();

            // Create cashier assigned to branch
            var cashier = new User { Id = "cashier-2", FirstName = "C", LastName = "User", Role = UserRole.Cashier, BranchId = branch.Id };
            ctx.Users.Add(cashier);

            // Create manager
            var manager = new User { Id = "manager-2", FirstName = "M", LastName = "Manager", Role = UserRole.Manager };
            ctx.Users.Add(manager);

            // Existing branch session with sufficient funds
            var existing = new CashSession
            {
                UserId = cashier.Id,
                BranchId = branch.Id,
                OpeningBalanceHTG = 5000m,
                OpeningBalanceUSD = 500m,
                ClosingBalanceHTG = 5000m,
                ClosingBalanceUSD = 500m,
                Status = CashSessionStatus.Closed,
                SessionStart = DateTime.UtcNow.AddHours(-4),
                SessionEnd = DateTime.UtcNow.AddHours(-3)
            };
            ctx.CashSessions.Add(existing);
            await ctx.SaveChangesAsync();

            var controller = CreateController(ctx);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(manager.Id) }
            };

            var dto = new OpenCashSessionForCashierDto
            {
                CashierId = cashier.Id,
                OpeningBalanceHTG = 1000m,
                OpeningBalanceUSD = 100m
            };

            var result = await controller.OpenCashSessionForCashier(dto);

            Assert.IsType<OkObjectResult>(result);

            // Verify session created in DB
            var session = await ctx.CashSessions.FirstOrDefaultAsync(cs => cs.UserId == cashier.Id && cs.Status == CashSessionStatus.Open);
            Assert.NotNull(session);
            Assert.Equal(1000m, session.OpeningBalanceHTG);
        }
    }
}
