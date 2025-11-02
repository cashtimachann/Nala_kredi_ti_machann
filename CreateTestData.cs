using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;
using System;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    Console.WriteLine("=== CRÉATION DE DONNÉES DE TEST ===");

    // Vérifier s'il y a déjà des données
    var existingAccounts = await context.SavingsAccounts.CountAsync();
    if (existingAccounts > 0)
    {
        Console.WriteLine($"Il y a déjà {existingAccounts} comptes dans la base de données. Aucune donnée de test créée.");
        return;
    }

    // Créer des clients de test
    var customers = new[]
    {
        new SavingsCustomer
        {
            Id = Guid.NewGuid().ToString(),
            FirstName = "Jean",
            LastName = "Pierre",
            DateOfBirth = new DateTime(1985, 5, 15),
            Gender = SavingsGender.Male,
            Street = "Rue du Centre",
            Commune = "Port-au-Prince",
            Department = "Ouest",
            Country = "Haïti",
            PrimaryPhone = "509-1234-5678",
            SecondaryPhone = "509-8765-4321",
            Email = "jean.pierre@email.com",
            DocumentType = "Carte d'Identité",
            DocumentNumber = "123456789",
            IssuedDate = new DateTime(2020, 1, 1),
            ExpiryDate = new DateTime(2030, 1, 1),
            IssuingAuthority = "ONI",
            Occupation = "Commerçant",
            MonthlyIncome = 25000,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        },
        new SavingsCustomer
        {
            Id = Guid.NewGuid().ToString(),
            FirstName = "Marie",
            LastName = "Joseph",
            DateOfBirth = new DateTime(1990, 8, 22),
            Gender = SavingsGender.Female,
            Street = "Avenue Christophe",
            Commune = "Pétion-Ville",
            Department = "Ouest",
            Country = "Haïti",
            PrimaryPhone = "509-2345-6789",
            Email = "marie.joseph@email.com",
            DocumentType = "Passeport",
            DocumentNumber = "P123456",
            IssuedDate = new DateTime(2021, 6, 15),
            ExpiryDate = new DateTime(2031, 6, 15),
            IssuingAuthority = "Ministère des Affaires Étrangères",
            Occupation = "Enseignante",
            MonthlyIncome = 18000,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        },
        new SavingsCustomer
        {
            Id = Guid.NewGuid().ToString(),
            FirstName = "Pierre",
            LastName = "Louis",
            DateOfBirth = new DateTime(1978, 12, 3),
            Gender = SavingsGender.Male,
            Street = "Boulevard Harry Truman",
            Commune = "Port-au-Prince",
            Department = "Ouest",
            Country = "Haïti",
            PrimaryPhone = "509-3456-7890",
            SecondaryPhone = "509-9876-5432",
            Email = "pierre.louis@email.com",
            DocumentType = "Carte d'Identité",
            DocumentNumber = "987654321",
            IssuedDate = new DateTime(2019, 3, 10),
            ExpiryDate = new DateTime(2029, 3, 10),
            IssuingAuthority = "ONI",
            Occupation = "Médecin",
            MonthlyIncome = 45000,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        }
    };

    await context.SavingsCustomers.AddRangeAsync(customers);
    await context.SaveChangesAsync();

    Console.WriteLine($"✅ {customers.Length} clients créés");

    // Récupérer la branche existante
    var branch = await context.Branches.FirstOrDefaultAsync();
    if (branch == null)
    {
        Console.WriteLine("❌ Aucune branche trouvée. Impossible de créer des comptes.");
        return;
    }

    // Créer des comptes d'épargne
    var accounts = new[]
    {
        new SavingsAccount
        {
            Id = Guid.NewGuid().ToString(),
            AccountNumber = "SAV00123456",
            CustomerId = customers[0].Id,
            BranchId = branch.Id,
            Currency = SavingsCurrency.HTG,
            Balance = 50000,
            AvailableBalance = 50000,
            MinimumBalance = 500,
            OpeningDate = DateTime.UtcNow.AddDays(-30),
            Status = SavingsAccountStatus.Active,
            InterestRate = 0.02m,
            DailyWithdrawalLimit = 50000,
            DailyDepositLimit = 500000,
            MonthlyWithdrawalLimit = 1000000,
            MaxBalance = 10000000,
            MinWithdrawalAmount = 100,
            MaxWithdrawalAmount = 50000,
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-30),
            LastTransactionDate = DateTime.UtcNow.AddDays(-5)
        },
        new SavingsAccount
        {
            Id = Guid.NewGuid().ToString(),
            AccountNumber = "SAV00234567",
            CustomerId = customers[1].Id,
            BranchId = branch.Id,
            Currency = SavingsCurrency.HTG,
            Balance = 25000,
            AvailableBalance = 25000,
            MinimumBalance = 500,
            OpeningDate = DateTime.UtcNow.AddDays(-15),
            Status = SavingsAccountStatus.Active,
            InterestRate = 0.02m,
            DailyWithdrawalLimit = 50000,
            DailyDepositLimit = 500000,
            MonthlyWithdrawalLimit = 1000000,
            MaxBalance = 10000000,
            MinWithdrawalAmount = 100,
            MaxWithdrawalAmount = 50000,
            CreatedAt = DateTime.UtcNow.AddDays(-15),
            UpdatedAt = DateTime.UtcNow.AddDays(-15),
            LastTransactionDate = DateTime.UtcNow.AddDays(-2)
        },
        new SavingsAccount
        {
            Id = Guid.NewGuid().ToString(),
            AccountNumber = "SAV00345678",
            CustomerId = customers[2].Id,
            BranchId = branch.Id,
            Currency = SavingsCurrency.USD,
            Balance = 1500,
            AvailableBalance = 1500,
            MinimumBalance = 10,
            OpeningDate = DateTime.UtcNow.AddDays(-60),
            Status = SavingsAccountStatus.Active,
            InterestRate = 0.015m,
            DailyWithdrawalLimit = 500,
            DailyDepositLimit = 5000,
            MonthlyWithdrawalLimit = 10000,
            MaxBalance = 100000,
            MinWithdrawalAmount = 5,
            MaxWithdrawalAmount = 500,
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            UpdatedAt = DateTime.UtcNow.AddDays(-60),
            LastTransactionDate = DateTime.UtcNow.AddDays(-10)
        }
    };

    await context.SavingsAccounts.AddRangeAsync(accounts);
    await context.SaveChangesAsync();

    Console.WriteLine($"✅ {accounts.Length} comptes d'épargne créés");

    // Créer quelques transactions pour les comptes
    var transactions = new[]
    {
        new SavingsTransaction
        {
            Id = Guid.NewGuid().ToString(),
            AccountId = accounts[0].Id,
            Type = SavingsTransactionType.Deposit,
            Amount = 50000,
            Currency = SavingsCurrency.HTG,
            BalanceBefore = 0,
            BalanceAfter = 50000,
            Description = "Dépôt initial d'ouverture",
            Reference = $"DEP-{DateTime.UtcNow.AddDays(-30):yyyyMMdd}-{accounts[0].AccountNumber}",
            ProcessedBy = "SYSTEM",
            BranchId = branch.Id,
            Status = SavingsTransactionStatus.Completed,
            ProcessedAt = DateTime.UtcNow.AddDays(-30),
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            Fees = 0
        },
        new SavingsTransaction
        {
            Id = Guid.NewGuid().ToString(),
            AccountId = accounts[1].Id,
            Type = SavingsTransactionType.Deposit,
            Amount = 25000,
            Currency = SavingsCurrency.HTG,
            BalanceBefore = 0,
            BalanceAfter = 25000,
            Description = "Dépôt initial d'ouverture",
            Reference = $"DEP-{DateTime.UtcNow.AddDays(-15):yyyyMMdd}-{accounts[1].AccountNumber}",
            ProcessedBy = "SYSTEM",
            BranchId = branch.Id,
            Status = SavingsTransactionStatus.Completed,
            ProcessedAt = DateTime.UtcNow.AddDays(-15),
            CreatedAt = DateTime.UtcNow.AddDays(-15),
            Fees = 0
        },
        new SavingsTransaction
        {
            Id = Guid.NewGuid().ToString(),
            AccountId = accounts[2].Id,
            Type = SavingsTransactionType.Deposit,
            Amount = 1500,
            Currency = SavingsCurrency.USD,
            BalanceBefore = 0,
            BalanceAfter = 1500,
            Description = "Dépôt initial d'ouverture",
            Reference = $"DEP-{DateTime.UtcNow.AddDays(-60):yyyyMMdd}-{accounts[2].AccountNumber}",
            ProcessedBy = "SYSTEM",
            BranchId = branch.Id,
            Status = SavingsTransactionStatus.Completed,
            ProcessedAt = DateTime.UtcNow.AddDays(-60),
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            Fees = 0
        },
        new SavingsTransaction
        {
            Id = Guid.NewGuid().ToString(),
            AccountId = accounts[0].Id,
            Type = SavingsTransactionType.Withdrawal,
            Amount = 5000,
            Currency = SavingsCurrency.HTG,
            BalanceBefore = 50000,
            BalanceAfter = 45000,
            Description = "Retrait pour achat",
            Reference = $"WD-{DateTime.UtcNow.AddDays(-5):yyyyMMdd}-{accounts[0].AccountNumber}",
            ProcessedBy = "SYSTEM",
            BranchId = branch.Id,
            Status = SavingsTransactionStatus.Completed,
            ProcessedAt = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            Fees = 0
        }
    };

    await context.SavingsTransactions.AddRangeAsync(transactions);
    await context.SaveChangesAsync();

    Console.WriteLine($"✅ {transactions.Length} transactions créées");

    // Mettre à jour les soldes des comptes après les transactions
    accounts[0].Balance = 45000;
    accounts[0].AvailableBalance = 45000;
    accounts[0].UpdatedAt = DateTime.UtcNow;

    await context.SaveChangesAsync();

    Console.WriteLine("\n=== DONNÉES DE TEST CRÉÉES AVEC SUCCÈS ===");
    Console.WriteLine("Vous pouvez maintenant accéder à la section 'Comptes Clients' dans la sidebar");
    Console.WriteLine("et voir les comptes créés dans l'interface.");
}