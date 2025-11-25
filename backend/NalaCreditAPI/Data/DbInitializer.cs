using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NalaCreditAPI.Data;
using NalaCreditAPI.Models;

namespace NalaCreditAPI.Data;

public static class DbInitializer
{
    public static async Task Initialize(ApplicationDbContext context, UserManager<User> userManager, RoleManager<IdentityRole> roleManager)
    {
        // Run all pending migrations (creates database and tables)
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Npgsql.PostgresException ex) when (ex.SqlState == "42P07")
        {
            // 42P07 = duplicate_table / relation already exists
            // This can happen when the DB was partially initialized outside migrations.
            // Log and continue — migrations likely already applied or partially applied.
            Console.WriteLine("[WARN] Migration conflict detected (relation already exists). Continuing initialization.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Database migration failed: {ex.Message}");
            throw; // rethrow after logging
        }

        // Create roles if they don't exist
        string[] roles = { "SuperAdmin", "Manager", "Cashier", "Employee", "Admin", "Support" };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // COMMENTÉ TEMPORAIREMENT: Ne pas supprimer les utilisateurs existants
        // FORCE RECREATE ALL USERS - Delete all existing users first
        // var existingUsers = await userManager.Users.ToListAsync();
        // foreach (var user in existingUsers)
        // {
        //     await userManager.DeleteAsync(user);
        // }
        // Console.WriteLine("✅ Tous les utilisateurs existants supprimés");

        // Create or reset super admin user
        var superAdminEmail = "superadmin@nalacredit.com";
        var superAdmin = await userManager.FindByEmailAsync(superAdminEmail);

        if (superAdmin == null)
        {
            superAdmin = new User
            {
                UserName = superAdminEmail,
                Email = superAdminEmail,
                FirstName = "Super",
                LastName = "Administrator",
                Role = UserRole.SuperAdmin,
                IsActive = true,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(superAdmin, "SuperAdmin123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(superAdmin, "SuperAdmin");
            }
        }
        else
        {
            // Reset superadmin user to ensure correct role and password
            superAdmin.Role = UserRole.SuperAdmin;
            superAdmin.IsActive = true;
            superAdmin.EmailConfirmed = true;

            // Reset password
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(superAdmin);
            await userManager.ResetPasswordAsync(superAdmin, resetToken, "SuperAdmin123!");

            // Ensure user is in SuperAdmin role
            if (!await userManager.IsInRoleAsync(superAdmin, "SuperAdmin"))
            {
                // Remove from any existing roles first
                var currentRoles = await userManager.GetRolesAsync(superAdmin);
                await userManager.RemoveFromRolesAsync(superAdmin, currentRoles);

                // Add to SuperAdmin role
                await userManager.AddToRoleAsync(superAdmin, "SuperAdmin");
            }

            await userManager.UpdateAsync(superAdmin);
        }

        // Seed system configuration if empty
        if (!context.SystemConfigurations.Any())
        {
            var configs = new List<SystemConfiguration>
            {
                new() { Key = "DefaultCurrency", Value = "HTG", Description = "Default system currency" },
                new() { Key = "ExchangeRateUSD", Value = "130.0", Description = "Current USD to HTG exchange rate" },
                new() { Key = "MaxDailyTransactionLimit", Value = "1000000", Description = "Maximum daily transaction limit" },
                new() { Key = "DefaultInterestRate", Value = "15.0", Description = "Default interest rate for credits" },
                new() { Key = "MaxCreditAmount", Value = "500000", Description = "Maximum credit amount" },
                new() { Key = "SystemMaintenanceMode", Value = "false", Description = "System maintenance mode flag" }
            };

            context.SystemConfigurations.AddRange(configs);
            await context.SaveChangesAsync();
        }

        // Seed default exchange rates if empty
        if (!context.CurrencyExchangeRates.Any())
        {
            var defaultRates = new List<CurrencyExchangeRate>
            {
                new CurrencyExchangeRate
                {
                    Id = Guid.NewGuid(),
                    BaseCurrency = CurrencyType.HTG,
                    TargetCurrency = CurrencyType.USD,
                    BuyingRate = 130.0m, // Rate to buy USD with HTG
                    SellingRate = 135.0m, // Rate to sell USD for HTG
                    EffectiveDate = DateTime.UtcNow.Date,
                    ExpiryDate = null, // No expiry
                    UpdateMethod = RateUpdateMethod.Manual,
                    IsActive = true,
                    Notes = "Default exchange rate seeded during initialization",
                    CreatedBy = "System",
                    UpdatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                },
                new CurrencyExchangeRate
                {
                    Id = Guid.NewGuid(),
                    BaseCurrency = CurrencyType.USD,
                    TargetCurrency = CurrencyType.HTG,
                    BuyingRate = 1.0m / 135.0m, // Inverse of selling rate
                    SellingRate = 1.0m / 130.0m, // Inverse of buying rate
                    EffectiveDate = DateTime.UtcNow.Date,
                    ExpiryDate = null, // No expiry
                    UpdateMethod = RateUpdateMethod.Manual,
                    IsActive = true,
                    Notes = "Default inverse exchange rate seeded during initialization",
                    CreatedBy = "System",
                    UpdatedBy = "System",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                }
            };

            context.CurrencyExchangeRates.AddRange(defaultRates);
            await context.SaveChangesAsync();
        }

        // Create sample branch if none exist
        if (!context.Branches.Any())
        {
            var sampleBranch = new Branch
            {
                Name = "Succursale Centrale",
                Address = "Port-au-Prince, Haiti",
                Phones = new List<string> { "+509 1234-5678" },
                Region = "Ouest",
                PrimaryCurrency = Currency.HTG,
                AcceptsUSD = true,
                AcceptsHTG = true,
                DailyTransactionLimit = 1000000,
                CashLimit = 500000,
                IsActive = true
            };

            context.Branches.Add(sampleBranch);
            await context.SaveChangesAsync();

            // Create sample branch supervisor
            var branchSupervisor = new User
            {
                UserName = "supervisor@nalacredit.com",
                Email = "supervisor@nalacredit.com",
                FirstName = "Jean",
                LastName = "Dupont",
                Role = UserRole.Manager,
                BranchId = sampleBranch.Id,
                IsActive = true,
                EmailConfirmed = true
            };

            var supervisorResult = await userManager.CreateAsync(branchSupervisor, "Supervisor123!");
            if (supervisorResult.Succeeded)
            {
                await userManager.AddToRoleAsync(branchSupervisor, "Manager");
            }

            // Create sample cashier
            var cashier = new User
            {
                UserName = "cashier@nalacredit.com",
                Email = "cashier@nalacredit.com",
                FirstName = "Marie",
                LastName = "Joseph",
                Role = UserRole.Cashier,
                BranchId = sampleBranch.Id,
                IsActive = true,
                EmailConfirmed = true
            };

            var cashierResult = await userManager.CreateAsync(cashier, "Cashier123!");
            if (cashierResult.Succeeded)
            {
                await userManager.AddToRoleAsync(cashier, "Cashier");
            }

            // Create sample credit agent
            var creditAgent = new User
            {
                UserName = "creditagent@nalacredit.com",
                Email = "creditagent@nalacredit.com",
                FirstName = "Pierre",
                LastName = "Michel",
                Role = UserRole.Employee,
                BranchId = sampleBranch.Id,
                IsActive = true,
                EmailConfirmed = true
            };

            var creditResult = await userManager.CreateAsync(creditAgent, "CreditAgent123!");
            if (creditResult.Succeeded)
            {
                await userManager.AddToRoleAsync(creditAgent, "Employee");
            }

            // Create regional manager
            var regionalManager = new User
            {
                UserName = "regional@nalacredit.com",
                Email = "regional@nalacredit.com",
                FirstName = "Joseph",
                LastName = "Laurent",
                Role = UserRole.Manager,
                IsActive = true,
                EmailConfirmed = true
            };

            var regionalResult = await userManager.CreateAsync(regionalManager, "Regional123!");
            if (regionalResult.Succeeded)
            {
                await userManager.AddToRoleAsync(regionalManager, "Manager");
            }

            // Create system admin
            var systemAdmin = new User
            {
                UserName = "sysadmin@nalacredit.com",
                Email = "sysadmin@nalacredit.com",
                FirstName = "Claude",
                LastName = "Moïse",
                Role = UserRole.Admin,
                IsActive = true,
                EmailConfirmed = true
            };

            var sysAdminResult = await userManager.CreateAsync(systemAdmin, "SysAdmin123!");
            if (sysAdminResult.Succeeded)
            {
                await userManager.AddToRoleAsync(systemAdmin, "Admin");
            }

            // Create accounting user
            var accounting = new User
            {
                UserName = "accounting@nalacredit.com",
                Email = "accounting@nalacredit.com",
                FirstName = "Fabiola",
                LastName = "Charles",
                Role = UserRole.Admin,
                IsActive = true,
                EmailConfirmed = true
            };

            var accountingResult = await userManager.CreateAsync(accounting, "Accounting123!");
            if (accountingResult.Succeeded)
            {
                await userManager.AddToRoleAsync(accounting, "Admin");
            }

            // Create management user
            var management = new User
            {
                UserName = "management@nalacredit.com",
                Email = "management@nalacredit.com",
                FirstName = "Richardson",
                LastName = "Bélizaire",
                Role = UserRole.Admin,
                IsActive = true,
                EmailConfirmed = true
            };

            var managementResult = await userManager.CreateAsync(management, "Management123!");
            if (managementResult.Succeeded)
            {
                await userManager.AddToRoleAsync(management, "Admin");
            }
        }
    }
}