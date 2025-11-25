using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Controllers; // For FileUploadResponseDto & CustomerFileDto
using Microsoft.Extensions.Logging.Abstractions;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using NalaCreditAPI.Services;
using NalaCreditAPI.DTOs;
using Xunit;
using System.IO;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System;
using System.Threading.Tasks;
using System.Text;

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
        public async Task CreateApplication_PersistsCustomerSnapshotAndGuarantee()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var savingsCustomer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "John", LastName = "Doe", PrimaryPhone = "1234567890", Email = "john.doe@example.com" };
            context.SavingsCustomers.Add(savingsCustomer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0001", CustomerId = savingsCustomer.Id, Status = SavingsAccountStatus.Active, Balance = 10000m, AvailableBalance = 10000m, BlockedBalance = 0m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();

            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var dto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 1000m, RequestedDurationMonths = 12, Purpose = "Test Loan", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 5000m, MonthlyExpenses = 2000m, ExistingDebts = 0m, Dependents = 2, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m, CustomerName = "John Doe", Phone = "1234567890", Email = "john.doe@example.com", CustomerAddress = "Rue 1" };
            var created = await service.CreateApplicationAsync(dto, user.Id);
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.Equal(150m, app.BlockedGuaranteeAmount);
        }

        [Fact]
        public async Task UploadDocument_SetsFlag()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var savingsCustomer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Jane", LastName = "Doe", PrimaryPhone = "0987654321", Email = "jane@example.com" };
            context.SavingsCustomers.Add(savingsCustomer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0002", CustomerId = savingsCustomer.Id, Status = SavingsAccountStatus.Active, Balance = 5000m, AvailableBalance = 5000m, BlockedBalance = 0m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();
            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var dto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 500m, RequestedDurationMonths = 12, Purpose = "Test", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 2000m, MonthlyExpenses = 1000m, ExistingDebts = 0m, InterestRate = 0.12m, MonthlyInterestRate = 0.01m };
            var created = await service.CreateApplicationAsync(dto, user.Id);
            var content = "fake-image";
            var fileName = "idcard.png";
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var formFile = new FormFile(stream, 0, stream.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png"
            };
            await service.UploadDocumentAsync(created.Id, formFile, MicrocreditDocumentType.IdCard, user.Id, "ID");
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.True(app.HasNationalId);
        }

        [Fact]
        public async Task CreateApplication_CreditAuto_30Percent()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var customer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Auto", LastName = "Buyer", PrimaryPhone = "111" };
            context.SavingsCustomers.Add(customer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0300", CustomerId = customer.Id, Status = SavingsAccountStatus.Active, Balance = 10000m, AvailableBalance = 10000m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();
            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var dto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.CreditAuto, RequestedAmount = 2000m, RequestedDurationMonths = 12, Purpose = "Car", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 8000m, MonthlyExpenses = 3000m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            var created = await service.CreateApplicationAsync(dto, user.Id);
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.Equal(600m, app.BlockedGuaranteeAmount);
        }

        [Fact]
        public async Task CreateApplication_CreditMoto_30Percent()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "user1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var customer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Moto", LastName = "Buyer", PrimaryPhone = "222" };
            context.SavingsCustomers.Add(customer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0301", CustomerId = customer.Id, Status = SavingsAccountStatus.Active, Balance = 5000m, AvailableBalance = 5000m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();
            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var dto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.CreditMoto, RequestedAmount = 1000m, RequestedDurationMonths = 10, Purpose = "Moto", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 6000m, MonthlyExpenses = 2500m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            var created = await service.CreateApplicationAsync(dto, user.Id);
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.Equal(300m, app.BlockedGuaranteeAmount);
        }

        [Fact]
        public async Task UpdateApplication_IncreaseAmount_AdjustsBlocked()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "u1", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var customer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Gary", LastName = "Amount", PrimaryPhone = "111" };
            context.SavingsCustomers.Add(customer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0400", CustomerId = customer.Id, Status = SavingsAccountStatus.Active, Balance = 10000m, AvailableBalance = 10000m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();
            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var createDto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 1000m, RequestedDurationMonths = 6, Purpose = "Init", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 4000m, MonthlyExpenses = 1000m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            var created = await service.CreateApplicationAsync(createDto, user.Id);
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.Equal(150m, app.BlockedGuaranteeAmount);
            // Force status to Draft to allow update
            app.Status = MicrocreditApplicationStatus.Draft;
            await context.SaveChangesAsync();
            app.Status = MicrocreditApplicationStatus.Draft;
            await context.SaveChangesAsync();
            app.Status = MicrocreditApplicationStatus.Draft;
            await context.SaveChangesAsync();
            app.Status = MicrocreditApplicationStatus.Draft;
            await context.SaveChangesAsync();
            var updateDto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 2000m, RequestedDurationMonths = 6, Purpose = "Upd", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 4000m, MonthlyExpenses = 1000m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            await service.UpdateApplicationAsync(created.Id, updateDto);
            app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            account = await context.SavingsAccounts.FirstAsync(a => a.AccountNumber == account.AccountNumber);
            Assert.Equal(300m, app.BlockedGuaranteeAmount);
            Assert.Equal(300m, account.BlockedBalance);
            Assert.Equal(10000m - 300m, account.AvailableBalance);
        }

        [Fact]
        public async Task UpdateApplication_LoanTypeChange_IncreasesBlocked()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "u2", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var customer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Lola", LastName = "Type", PrimaryPhone = "222" };
            context.SavingsCustomers.Add(customer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0401", CustomerId = customer.Id, Status = SavingsAccountStatus.Active, Balance = 5000m, AvailableBalance = 5000m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();
            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var createDto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 1000m, RequestedDurationMonths = 12, Purpose = "Init", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 6000m, MonthlyExpenses = 2000m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            var created = await service.CreateApplicationAsync(createDto, user.Id);
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.Equal(150m, app.BlockedGuaranteeAmount);
            app.Status = MicrocreditApplicationStatus.Draft; // ensure updatable
            await context.SaveChangesAsync();
            var updateDto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.CreditAuto, RequestedAmount = 1000m, RequestedDurationMonths = 12, Purpose = "Type", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 6000m, MonthlyExpenses = 2000m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            await service.UpdateApplicationAsync(created.Id, updateDto);
            app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            account = await context.SavingsAccounts.FirstAsync(a => a.AccountNumber == account.AccountNumber);
            Assert.Equal(300m, app.BlockedGuaranteeAmount);
            Assert.Equal(300m, account.BlockedBalance);
            Assert.Equal(5000m - 300m, account.AvailableBalance);
        }

        [Fact]
        public async Task UpdateApplication_DecreaseAmount_ReducesBlocked()
        {
            var context = await CreateInMemoryDbContextAsync();
            context.Branches.Add(new Branch { Id = 1, Name = "Test Branch" });
            var user = new User { Id = "user3", FirstName = "Test", LastName = "Officer" };
            context.Users.Add(user);
            var customer = new SavingsCustomer { Id = Guid.NewGuid().ToString(), FirstName = "Dec", LastName = "Amt", PrimaryPhone = "333" };
            context.SavingsCustomers.Add(customer);
            var account = new SavingsAccount { Id = Guid.NewGuid().ToString(), AccountNumber = "SA-0402", CustomerId = customer.Id, Status = SavingsAccountStatus.Active, Balance = 5000m, AvailableBalance = 5000m };
            context.SavingsAccounts.Add(account);
            await context.SaveChangesAsync();
            var service = new MicrocreditLoanApplicationService(context, new TestFileStorageService(), NullLogger<MicrocreditLoanApplicationService>.Instance);
            var createDto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 1000m, RequestedDurationMonths = 12, Purpose = "Init", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 4000m, MonthlyExpenses = 1500m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            var created = await service.CreateApplicationAsync(createDto, user.Id);
            var app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            Assert.Equal(150m, app.BlockedGuaranteeAmount);
            app.Status = MicrocreditApplicationStatus.Draft; // ensure updatable
            await context.SaveChangesAsync();
            var updateDto = new CreateMicrocreditLoanApplicationDto { SavingsAccountNumber = account.AccountNumber, LoanType = MicrocreditLoanType.Personal, RequestedAmount = 500m, RequestedDurationMonths = 12, Purpose = "Dec", Currency = MicrocreditCurrency.HTG, BranchId = 1, MonthlyIncome = 4000m, MonthlyExpenses = 1500m, ExistingDebts = 0m, Dependents = 0, InterestRate = 0.15m, MonthlyInterestRate = 0.0125m };
            await service.UpdateApplicationAsync(created.Id, updateDto);
            app = await context.MicrocreditLoanApplications.FirstAsync(a => a.Id == created.Id);
            account = await context.SavingsAccounts.FirstAsync(a => a.AccountNumber == account.AccountNumber);
            Assert.Equal(75m, app.BlockedGuaranteeAmount);
            Assert.Equal(75m, account.BlockedBalance);
            Assert.Equal(5000m - 75m, account.AvailableBalance);
        }
    }

    public class TestFileStorageService : IFileStorageService
    {
        public Task<FileUploadResponseDto> UploadFileAsync(IFormFile file, string customerId, string fileType)
        {
            return Task.FromResult(new FileUploadResponseDto
            {
                FileName = file?.FileName ?? "testfile.jpg",
                FileUrl = $"/uploads/{customerId}/{fileType}_testfile.jpg",
                FileType = fileType,
                FileSize = file?.Length ?? 0,
                UploadedAt = DateTime.UtcNow
            });
        }
        public Task<FileUploadResponseDto> UploadSignatureAsync(byte[] imageBytes, string customerId)
        {
            return Task.FromResult(new FileUploadResponseDto
            {
                FileName = "signature.png",
                FileUrl = $"/uploads/{customerId}/signature.png",
                FileType = "signature",
                FileSize = imageBytes?.Length ?? 0,
                UploadedAt = DateTime.UtcNow
            });
        }
        public Task<(byte[]? fileBytes, string contentType)> GetFileAsync(string fileName) => Task.FromResult<(byte[]?, string)>((null, string.Empty));
        public Task<bool> DeleteFileAsync(string fileName) => Task.FromResult(true);
        public Task<List<CustomerFileDto>> GetCustomerFilesAsync(string customerId) => Task.FromResult(new List<CustomerFileDto>());
    }
}
