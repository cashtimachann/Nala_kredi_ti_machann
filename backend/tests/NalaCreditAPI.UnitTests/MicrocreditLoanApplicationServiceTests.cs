using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.DTOs;
using Xunit;
using System.IO;
using System.Text;
using Microsoft.AspNetCore.Http;
using NalaCreditAPI.Controllers;
using System.Collections.Generic;
using System;
using System.Threading.Tasks;

namespace NalaCreditAPI.UnitTests
{
    public class MicrocreditLoanApplicationServiceTests
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
        public async Task CreateApplication_PersistsCustomerSnapshotAndGuarantees()
        {
            var context = await CreateInMemoryDbContextAsync();

            // Seed branch
            var branch = new Branch { Id = 1, Name = "Test Branch" };
            context.Branches.Add(branch);

            // Seed user
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);

            // Seed savings customer and account
            var savingsCustomer = new SavingsCustomer
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = "John",
                LastName = "Doe",
                Street = "Rue 1",
                Commune = "Port-au-Prince",
                Department = "Ouest",
                Country = "Haiti",
                PrimaryPhone = "1234567890",
                Email = "john.doe@example.com",
                DocumentNumber = "ABC123"
            };
            context.SavingsCustomers.Add(savingsCustomer);

            var savingsAccount = new SavingsAccount
            {
                Id = Guid.NewGuid().ToString(),
                AccountNumber = "SA-0001",
                CustomerId = savingsCustomer.Id,
                Status = SavingsAccountStatus.Active,
                AvailableBalance = 10000,
                BlockedBalance = 0
            };
            context.SavingsAccounts.Add(savingsAccount);

            await context.SaveChangesAsync();

            // Create service
            var fileStorageService = new TestFileStorageService();
            var service = new MicrocreditLoanApplicationService(context, fileStorageService);

            var dto = new CreateMicrocreditLoanApplicationDto
            {
                SavingsAccountNumber = savingsAccount.AccountNumber,
                LoanType = MicrocreditLoanType.Personal,
                RequestedAmount = 1000m,
                RequestedDurationMonths = 12,
                Purpose = "Test Loan",
                Currency = MicrocreditCurrency.HTG,
                BranchId = 1,
                MonthlyIncome = 5000m,
                MonthlyExpenses = 2000m,
                ExistingDebts = 0m,
                Dependents = 2,
                InterestRate = 0.15m,
                MonthlyInterestRate = 0.0125m,
                CustomerName = "John Doe",
                Phone = "1234567890",
                Email = "john.doe@example.com",
                CustomerAddress = "Rue 1, Port-au-Prince",
                Occupation = "Trader"
            };

            var created = await service.CreateApplicationAsync(dto, user.Id);

            var savedApp = await context.MicrocreditLoanApplications.FirstOrDefaultAsync(a => a.Id == created.Id);
            Assert.NotNull(savedApp);
            Assert.Equal("John Doe", savedApp.CustomerName);
            Assert.Equal("1234567890", savedApp.CustomerPhone);
            Assert.Equal("john.doe@example.com", savedApp.CustomerEmail);
            Assert.Contains("Rue", savedApp.CustomerAddressJson ?? "");
            Assert.Equal("Trader", savedApp.Occupation);
            Assert.Equal(dto.InterestRate, savedApp.InterestRate);
        }

        [Fact]
        public async Task UploadDocument_SetsFlagBasedOnType()
        {
            var context = await CreateInMemoryDbContextAsync();
            var branch = new Branch { Id = 1, Name = "Test Branch" };
            context.Branches.Add(branch);
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);

            var savingsCustomer = new SavingsCustomer
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = "Jane",
                LastName = "Doe",
                PrimaryPhone = "0987654321",
                Email = "jane.doe@example.com",
                DocumentNumber = "ID456"
            };
            context.SavingsCustomers.Add(savingsCustomer);

            var savingsAccount = new SavingsAccount
            {
                Id = Guid.NewGuid().ToString(),
                AccountNumber = "SA-0002",
                CustomerId = savingsCustomer.Id,
                Status = SavingsAccountStatus.Active,
                AvailableBalance = 5000,
                BlockedBalance = 0
            };
            context.SavingsAccounts.Add(savingsAccount);
            await context.SaveChangesAsync();

            var fileStorageService = new TestFileStorageService();
            var service = new MicrocreditLoanApplicationService(context, fileStorageService);

            var dto = new CreateMicrocreditLoanApplicationDto
            {
                SavingsAccountNumber = savingsAccount.AccountNumber,
                LoanType = MicrocreditLoanType.Personal,
                RequestedAmount = 500m,
                RequestedDurationMonths = 12,
                Currency = MicrocreditCurrency.HTG,
                BranchId = 1,
                MonthlyIncome = 2000m,
                MonthlyExpenses = 1000m,
                ExistingDebts = 0m,
                InterestRate = 0.12m,
                MonthlyInterestRate = 0.01m
            };

            var created = await service.CreateApplicationAsync(dto, user.Id);

            // Create fake IFormFile
            var content = "fake-image";
            var fileName = "idcard.png";
            var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(content));
            var formFile = new FormFile(stream, 0, stream.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };

            // Upload ID card
            var uploaded = await service.UploadDocumentAsync(created.Id, formFile, MicrocreditDocumentType.IdCard, user.Id, "ID copy");

            var savedApp = await context.MicrocreditLoanApplications.FirstOrDefaultAsync(a => a.Id == created.Id);
            Assert.NotNull(savedApp);
            Assert.True(savedApp.HasNationalId);
        }

        [Fact]
        public async Task UpdateApplication_UpdatesCustomerSnapshotFields()
        {
            var context = await CreateInMemoryDbContextAsync();
            var branch = new Branch { Id = 1, Name = "Test Branch" };
            context.Branches.Add(branch);
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);

            var savingsCustomer = new SavingsCustomer
            {
                Id = Guid.NewGuid().ToString(),
                FirstName = "Sam",
                LastName = "Smith",
                PrimaryPhone = "5551234567",
                Email = "sam.smith@example.com",
                DocumentNumber = "DOC789"
            };
            context.SavingsCustomers.Add(savingsCustomer);

            var savingsAccount = new SavingsAccount
            {
                Id = Guid.NewGuid().ToString(),
                AccountNumber = "SA-0003",
                CustomerId = savingsCustomer.Id,
                Status = SavingsAccountStatus.Active,
                // Make available balance smaller than guarantee (15% of 1000 = 150) so application stays Draft
                AvailableBalance = 100,
                BlockedBalance = 0
            };
            context.SavingsAccounts.Add(savingsAccount);
            await context.SaveChangesAsync();

            var fileStorageService = new TestFileStorageService();
            var service = new MicrocreditLoanApplicationService(context, fileStorageService);

            var dto = new CreateMicrocreditLoanApplicationDto
            {
                SavingsAccountNumber = savingsAccount.AccountNumber,
                LoanType = MicrocreditLoanType.Personal,
                RequestedAmount = 1000m,
                RequestedDurationMonths = 6,
                Currency = MicrocreditCurrency.HTG,
                BranchId = 1
            };

            var created = await service.CreateApplicationAsync(dto, user.Id);

            var updateDto = new CreateMicrocreditLoanApplicationDto
            {
                SavingsAccountNumber = savingsAccount.AccountNumber,
                LoanType = MicrocreditLoanType.Personal,
                RequestedAmount = 1000m,
                RequestedDurationMonths = 6,
                Purpose = "Update Purpose",
                Currency = MicrocreditCurrency.HTG,
                BranchId = 1,
                MonthlyIncome = 1000m,
                MonthlyExpenses = 500m,
                ExistingDebts = 0m,
                InterestRate = 0.12m,
                MonthlyInterestRate = 0.01m,
                CustomerName = "Samuel Smith",
                Phone = "5559876543",
                Email = "samuel.smith@example.com",
                CustomerAddress = "New address",
                Occupation = "Merchant"
            };

            await service.UpdateApplicationAsync(created.Id, updateDto);

            var savedApp = await context.MicrocreditLoanApplications.FirstOrDefaultAsync(a => a.Id == created.Id);
            Assert.NotNull(savedApp);
            Assert.Equal("Samuel Smith", savedApp.CustomerName);
            Assert.Equal("5559876543", savedApp.CustomerPhone);
            Assert.Equal("samuel.smith@example.com", savedApp.CustomerEmail);
            Assert.Equal("Merchant", savedApp.Occupation);
        }
    }

    // Simple fake file storage service for testing that implements the IFileStorageService
    public class TestFileStorageService : IFileStorageService
    {
        public Task<FileUploadResponseDto> UploadFileAsync(IFormFile file, string customerId, string fileType)
        {
            var dto = new FileUploadResponseDto
            {
                FileName = file?.FileName ?? "testfile.jpg",
                FileUrl = $"/uploads/{customerId}/{fileType}_testfile.jpg",
                FileType = fileType,
                FileSize = file?.Length ?? 0,
                UploadedAt = DateTime.UtcNow
            };

            return Task.FromResult(dto);
        }

        public Task<FileUploadResponseDto> UploadSignatureAsync(byte[] imageBytes, string customerId)
        {
            var dto = new FileUploadResponseDto
            {
                FileName = $"signature_{DateTime.UtcNow:yyyyMMdd_HHmmss}.png",
                FileUrl = $"/uploads/{customerId}/signature_testfile.png",
                FileType = "signature",
                FileSize = imageBytes?.Length ?? 0,
                UploadedAt = DateTime.UtcNow
            };

            return Task.FromResult(dto);
        }

        public Task<(byte[]? fileBytes, string contentType)> GetFileAsync(string fileName)
        {
            return Task.FromResult<(byte[]?, string)>((null, string.Empty));
        }

        public Task<bool> DeleteFileAsync(string fileName)
        {
            return Task.FromResult(true);
        }

        public Task<List<CustomerFileDto>> GetCustomerFilesAsync(string customerId)
        {
            return Task.FromResult(new List<CustomerFileDto>());
        }
    }
}
